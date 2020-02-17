import { Store } from "./store";
import CancellationSource from "./cancel";
declare enum FlowActionType {
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
export declare class FlowAction<T = any> {
    type: FlowActionType;
    payload?: T;
    equals(value: any, equals?: <U>(x: U, y: U) => boolean): boolean;
    constructor(type: FlowActionType, payload?: T);
}
export declare class WaitUntilAction<T = any> extends FlowAction<T> {
    payload?: T;
    constructor(payload?: T);
}
export declare class PublishAction<T = any> extends FlowAction<T> {
    payload?: T;
    constructor(payload?: T);
}
export declare class CallAction<T = any> extends FlowAction<T> {
    payload?: T;
    constructor(payload?: T);
}
export declare class SpawnAction<T = any> extends FlowAction<T> {
    payload?: T;
    constructor(payload?: T);
}
export declare class CancelAction<T = any> extends FlowAction<T> {
    payload?: T;
    constructor(payload?: T);
}
export declare class OnCancelAction<T = any> extends FlowAction<T> {
    payload?: T;
    constructor(payload?: T);
}
export declare class DelayAction<T = any> extends FlowAction<T> {
    payload?: T;
    constructor(payload?: T);
}
export declare class AllAction<T = any> extends FlowAction<T> {
    payload?: T;
    constructor(payload?: T);
}
export declare class RaceAction<T = any> extends FlowAction<T> {
    payload?: T;
    constructor(payload?: T);
}
export declare class SelectAction<T = any> extends FlowAction<T> {
    payload?: T;
    constructor(payload?: T);
}
export declare type FlowContextTask = {
    parentCancellationSource?: CancellationSource;
    cancellationSource: CancellationSource;
    iterator: Iterator<any>;
    isTest: boolean;
    isRunning: boolean;
    isDone: boolean;
};
export declare type DeriveFlowContext<T> = T extends Store<infer U, infer R, any> ? FlowContext<U, R, keyof R> : any;
declare type ExtractGeneratorReturnValue<G> = G extends Generator<any, infer T> ? T : unknown;
declare type ExtractPromiseGenericValue<P> = P extends PromiseLike<infer T> ? T : unknown;
declare type MapGeneratorsToReturnValue<T> = {
    [P in keyof T]: ExtractGeneratorReturnValue<T[P]>;
};
export declare class FlowContext<T, R, U extends keyof R> {
    private store;
    task: FlowContextTask;
    private doneListeners;
    constructor(store: Store<T, R, U>, generator: Function, cancellationSource?: CancellationSource);
    private addDoneListener;
    private onDone;
    /**
     * Halts execution until the given type is published.
     */
    waitUntil(type: U): Generator<any, void>;
    /**
     * Returns the name and the returned value of the generator that finished first and cancels all other generators.
     */
    race<X, T = {
        [key: string]: Generator<X>;
    }, TRet = MapGeneratorsToReturnValue<T>, TKey = keyof TRet>(generators: T): Generator<any, TKey extends any ? {
        name: TKey;
        value: TRet[keyof TRet];
    } : never>;
    /**
     * Returns the results of the generators when every generator finished.
     */
    all<X, T = {
        [key: string]: Generator<any, X>;
    }>(generators: T): Generator<any, {
        [P in keyof T]: ExtractGeneratorReturnValue<T[P]>;
    }>;
    /**
     * Calls the given function and returns the returned value.
     * @param selector A function that transformes the state into any valid value.
     */
    select<TRes>(selector: (state: T) => TRes): Generator<any, TRes>;
    /**
     * The same as the normal publish function of the store.
     */
    publish(type: U, payload?: R[U], custom?: any): Generator<Promise<void> | PublishAction<{
        type: U;
        payload: R[U];
        custom: any;
    }>, any, unknown>;
    /**
     * Calls the given function with the provided arguments.
     * Cancelling the FlowContext won't stop the function call itself.
     * @param args Arguments of the given function.
     * @returns A promise that only resolves if the FlowContext hasn't
     * been cancelled until the promises completes.
     */
    call<TFunc extends (...args: any) => Promise<any>>(f: TFunc, ...args: Parameters<TFunc>): Generator<any, ExtractPromiseGenericValue<ReturnType<TFunc>>>;
    /**
     * Stops the execution of the given FlowContext.
     */
    cancel(c: FlowContext<any, any, any>): Generator<boolean | CancelAction<FlowContext<any, any, any>>, any, unknown>;
    /**
     * Calls a function when the FlowContext gets cancelled.
     * It is important that this action is the first in the generator function.
     */
    onCancel(f: Function): Generator<OnCancelAction<Function>, any, unknown>;
    /**
     * Creates a new FlowContext with the given function.
     */
    spawn(f: Function): Generator<FlowContext<T, R, U> | SpawnAction<Function>, any, unknown>;
    /**
     * Halts the execution of the current FlowContext until the given time has passed.
     * @param ms time in milliseconds
     */
    delay(ms: number): Generator<DelayAction<number> | Promise<unknown>, any, unknown>;
    run(): Promise<void>;
    test(): {
        next: (...args: any) => any;
        getResult: () => any;
    };
}
export {};
