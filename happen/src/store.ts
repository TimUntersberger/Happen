import { FlowContext } from "./flow";

export type Action<T = any, R = any> = {
  type: T;
  payload?: R;
  custom?: any;
};

export type StoreSettings = {
  debug: {
    flow: boolean;
  };
};

export class Store<T, R, U extends keyof R> {
  public flows: {
    [key: string]: FlowContext<T, R, U>;
  } = {};
  public state: T;
  public settings: StoreSettings = {
    debug: {
      flow: false
    }
  };

  private subscribers: {
    [key: number]: ((state: T, action: Action<U, R[U]>, oldState: T) => void)[];
  } = {};

  private listeners: ((
    state: T,
    action: Action<U, R[U]>,
    oldState: T
  ) => void)[] = [];

  /**
   * @param state The initial State
   * @param settings Custom settings
   */
  constructor(state: T, settings: Partial<StoreSettings>) {
    this.state = state;
    this.settings = {
      ...this.settings,
      ...settings,
      debug: {
        ...this.settings.debug,
        ...settings.debug
      }
    };
  }

  public listen = (
    cb: (state: T, action: Action<U, R[U]>, oldState: T) => void
  ): void => {
    this.listeners.push(cb);
  };

  public task = (
    generator: (flowContext: FlowContext<T, R, U>) => Generator<any, any, any>
  ) => {
    return generator;
  };

  public addFlow = (
    name: string,
    generator: (flowContext: FlowContext<T, R, U>) => Generator<any, any, any>
  ): void => {
    this.flows[name] = new FlowContext(this, generator);
  };

  public runFlows() {
    Object.keys(this.flows).forEach(k => this.flows[k].run());
  }
  public runFlow(flow: (ctx: any) => Generator);
  public runFlow(name: string);
  public runFlow(arg: ((ctx: any) => Generator) | string) {
    if (typeof arg === "function") {
      new FlowContext(this, arg).run();
    } else if (typeof arg === "string") {
      this.flows[arg].run();
    }
  }

  public subscribe = (
    actionType: U,
    cb: (state: T, action: Action<U, R[U]>, oldState: T) => void
  ): (() => void) => {
    if (!this.subscribers[(actionType as any) as number]) {
      this.subscribers[(actionType as any) as number] = [] as any;
    }

    this.subscribers[(actionType as any) as number].push(cb);

    return () =>
      this.subscribers[(actionType as any) as number].splice(
        this.subscribers[(actionType as any) as number].indexOf(cb),
        1
      );
  };

  private callFunctions(functions: Function[], oldState: any, action: any) {
    functions.forEach(f => f(this.state, action, oldState));
  }

  public publish = (type: U, payload?: R[U], custom?: any): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        const action: Action<U, R[U]> = {
          type,
          payload,
          custom
        };
        const oldState = JSON.parse(JSON.stringify(this.state));
        const subscribers = this.subscribers[(action.type as any) as number];
        if (subscribers) {
          this.callFunctions(subscribers, oldState, action);
        }
        this.callFunctions(this.listeners, oldState, action);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  };
}
