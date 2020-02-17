import { Store } from "./store";
import CancellationSource from "./cancel";

enum FlowActionType {
  WaitUntil = "WaitUntil",
  Select = "Select",
  Publish = "Publish",
  Call = "Call",
  Spawn = "Spawn",
  Cancel = "Cancel",
  OnCancel = "OnCancel",
  Delay = "Delay",
  All = "All",
  Race = "Race"
}

export class FlowAction<T = any> {
  equals(value: any, equals = <U>(x: U, y: U) => x === y) {
    if (!value || !(value instanceof FlowAction)) return false;
    return this.type === value.type && equals(this.payload, value.payload);
  }
  constructor(public type: FlowActionType, public payload?: T) {}
}

export class WaitUntilAction<T = any> extends FlowAction<T> {
  constructor(public payload?: T) {
    super(FlowActionType.WaitUntil, payload);
  }
}

export class PublishAction<T = any> extends FlowAction<T> {
  constructor(public payload?: T) {
    super(FlowActionType.Publish, payload);
  }
}

export class CallAction<T = any> extends FlowAction<T> {
  constructor(public payload?: T) {
    super(FlowActionType.Call, payload);
  }
}

export class SpawnAction<T = any> extends FlowAction<T> {
  constructor(public payload?: T) {
    super(FlowActionType.Spawn, payload);
  }
}

export class CancelAction<T = any> extends FlowAction<T> {
  constructor(public payload?: T) {
    super(FlowActionType.Cancel, payload);
  }
}

export class OnCancelAction<T = any> extends FlowAction<T> {
  constructor(public payload?: T) {
    super(FlowActionType.OnCancel, payload);
  }
}

export class DelayAction<T = any> extends FlowAction<T> {
  constructor(public payload?: T) {
    super(FlowActionType.Delay, payload);
  }
}

export class AllAction<T = any> extends FlowAction<T> {
  constructor(public payload?: T) {
    super(FlowActionType.All, payload);
  }
}

export class RaceAction<T = any> extends FlowAction<T> {
  constructor(public payload?: T) {
    super(FlowActionType.Race, payload);
  }
}

export class SelectAction<T = any> extends FlowAction<T> {
  constructor(public payload?: T) {
    super(FlowActionType.Select, payload);
  }
}

export type FlowContextTask = {
  parentCancellationSource?: CancellationSource;
  cancellationSource: CancellationSource;
  iterator: Iterator<any>;
  isTest: boolean;
  isRunning: boolean;
  isDone: boolean;
};

export type DeriveFlowContext<T> = T extends Store<infer U, infer R, any>
  ? FlowContext<U, R, keyof R>
  : any;

type ExtractGeneratorReturnValue<G> = G extends Generator<any, infer T>
  ? T
  : unknown;

type ExtractPromiseGenericValue<P> = P extends PromiseLike<infer T>
  ? T
  : unknown;

type MapGeneratorsToReturnValue<T> = {
  [P in keyof T]: ExtractGeneratorReturnValue<T[P]>;
};

export class FlowContext<T, R, U extends keyof R> {
  task: FlowContextTask;

  private doneListeners: Function[] = [];

  constructor(
    private store: Store<T, R, U>,
    generator: Function,
    cancellationSource?: CancellationSource
  ) {
    this.task = {
      iterator: generator(this),
      parentCancellationSource: cancellationSource,
      cancellationSource: new CancellationSource(),
      isTest: false,
      isRunning: false,
      isDone: false
    };
    if (cancellationSource) {
      const unsub = cancellationSource.addEventHandler(() =>
        this.task.cancellationSource.cancel()
      );
      this.task.cancellationSource.addEventHandler(() => unsub());
      this.addDoneListener(() => unsub());
    }
  }
  private addDoneListener(f: Function) {
    this.doneListeners.push(f);
  }
  private onDone() {
    this.doneListeners.forEach(f => f());
    this.task.isRunning = false;
    this.doneListeners = [];
  }
  //TODO: Maybe always yield the action and call next twice per loop in the run function
  /**
   * Halts execution until the given type is published.
   */
  public *waitUntil(type: U): Generator<any, void> {
    const res = yield new WaitUntilAction(type);

    if (this.task.isTest) return res as any;

    return (yield new Promise(resolve => {
      let unsubFromStore: any;

      const cb = (unsub: () => any) => {
        unsub && unsub();
        unsubFromStore();
      };

      unsubFromStore = this.store.subscribe(type, () => {
        setTimeout(() => {
          unsubFromStore();
          this.task.cancellationSource.removeEventHandler(cb);
          resolve();
        }, 0);
      });

      this.task.cancellationSource.addEventHandler(cb);
    })) as any;
  }
  /**
   * Returns the name and the returned value of the generator that finished first and cancels all other generators.
   */
  public *race<
    X,
    T = {
      [key: string]: Generator<X>;
    },
    TRet = MapGeneratorsToReturnValue<T>,
    TKey = keyof TRet
  >(
    generators: T
  ): Generator<
    any,
    TKey extends any ? { name: TKey; value: TRet[keyof TRet] } : never
  > {
    const res = yield new RaceAction(generators);

    if (this.task.isTest) return res as any;

    const keys = Object.keys(generators);

    return (yield Promise.race(
      keys.map(k => {
        const gen = generators[k];
        gen.next();
        return gen.next().value.then((value: any) => ({ name: k, value }));
      })
    )) as any;
  }

  /**
   * Returns the results of the generators when every generator finished.
   */
  public *all<
    X,
    T = {
      [key: string]: Generator<any, X>;
    }
  >(
    generators: T
  ): Generator<any, { [P in keyof T]: ExtractGeneratorReturnValue<T[P]> }> {
    const res = yield new AllAction(generators);

    if (this.task.isTest) return res as any;

    const keys = Object.keys(generators);

    return (yield Promise.all(
      keys.map(k => {
        const gen = generators[k];
        gen.next();
        return gen.next().value;
      })
    ).then(results =>
      results.reduce((res, returnValue, index) => {
        res[keys[index]] = returnValue;
        return res;
      }, {})
    )) as any;
  }
  /**
   * Calls the given function and returns the returned value.
   * @param selector A function that transformes the state into any valid value.
   */
  public *select<TRes>(selector: (state: T) => TRes): Generator<any, TRes> {
    const res: any = yield new SelectAction(selector);

    if (this.task.isTest) return res;

    return (yield selector(this.store.state)) as any;
  }
  /**
   * The same as the normal publish function of the store.
   */
  public *publish(type: U, payload?: R[U], custom?: any) {
    const res = yield new PublishAction({
      type,
      payload,
      custom
    });

    if (this.task.isTest) return res;

    return yield this.store.publish(type, payload, custom);
  }
  /**
   * Calls the given function with the provided arguments.
   * Cancelling the FlowContext won't stop the function call itself.
   * @param args Arguments of the given function.
   * @returns A promise that only resolves if the FlowContext hasn't
   * been cancelled until the promises completes.
   */
  public *call<TFunc extends (...args: any) => Promise<any>>(
    f: TFunc,
    ...args: Parameters<TFunc>
  ): Generator<any, ExtractPromiseGenericValue<ReturnType<TFunc>>> {
    const res = yield new CallAction(() => f(...args));

    if (this.task.isTest) return res as any;

    return (yield new Promise(async resolve => {
      const res = await f(...args);
      if (!this.task.cancellationSource.isCancelled) resolve(res);
    })) as any;
  }
  /**
   * Stops the execution of the given FlowContext.
   */
  public *cancel(c: FlowContext<any, any, any>) {
    const res = yield new CancelAction(c);

    if (this.task.isTest) return res;

    c.task.cancellationSource.cancel();

    return yield c.task.isDone;
  }
  /**
   * Calls a function when the FlowContext gets cancelled.
   * It is important that this action is the first in the generator function.
   */
  public *onCancel(f: Function) {
    const res = yield new OnCancelAction(f);

    if (this.task.isTest) return res;

    const unsub = this.task.cancellationSource.addEventHandler(unsub => {
      unsub();
      f();
    });

    this.addDoneListener(() => {
      unsub();
    });

    return yield;
  }
  /**
   * Creates a new FlowContext with the given function.
   */
  public *spawn(f: Function) {
    const res = yield new SpawnAction(f);

    if (this.task.isTest) return res;

    const ctx = new FlowContext(this.store, f, this.task.cancellationSource);
    ctx.run();
    return yield ctx;
  }
  /**
   * Halts the execution of the current FlowContext until the given time has passed.
   * @param ms time in milliseconds
   */
  public *delay(ms: number) {
    const res = yield new DelayAction(ms);

    if (this.task.isTest) return res;

    return yield new Promise(resolve => {
      let timeout: number;

      const cb = (unsub: () => void) => {
        clearTimeout(timeout);
        unsub();
      };

      timeout = setTimeout(() => {
        clearTimeout(timeout);
        resolve();
        this.task.cancellationSource.removeEventHandler(cb);
      }, ms);

      this.task.cancellationSource.addEventHandler(cb);
    });
  }

  public async run() {
    if (this.task.isRunning) return;
    this.task.isRunning = true;
    this.task.isTest = false;

    let result = { done: false } as any;
    let returnValue: any;

    while (!result.done && !this.task.cancellationSource.isCancelled) {
      result = this.task.iterator.next(returnValue);

      if (result.done) {
        continue;
      }

      if (this.store.settings.debug.flow && result.value)
        console.log(`Action: ${result.value.type}`);

      result = this.task.iterator.next();

      if (this.task.cancellationSource.isCancelled) {
        this.task.iterator.return!();
      } else if (result.value) {
        returnValue = await result.value;
      }
    }

    this.task.isDone = true;
    this.onDone();
  }

  public test() {
    if (this.task.isRunning) return;
    this.task.isRunning = true;
    this.task.isTest = true;
    let result = null as any;
    const testRunner = {
      next: (...args: any) => {
        if (this.task.isDone) {
          throw new Error("Flow is already done");
        }
        result = this.task.iterator.next(...args);
        if (result.done) {
          this.task.isRunning = false;
          this.task.isDone = true;
          this.onDone();
        }
        if (this.task.isDone) {
        }
        return result.value;
      },
      getResult: () => result
    };

    return testRunner;
  }
}
