import { FlowContext } from "./flow";
export declare type Action<T = any, R = any> = {
    type: T;
    payload?: R;
    custom?: any;
};
export declare type StoreSettings = {
    debug: {
        flow: boolean;
    };
};
export declare class Store<T, R, U extends keyof R> {
    flows: {
        [key: string]: FlowContext<T, R, U>;
    };
    state: T;
    settings: StoreSettings;
    private subscribers;
    private listeners;
    /**
     * @param state The initial State
     * @param settings Custom settings
     */
    constructor(state: T, settings: Partial<StoreSettings>);
    listen: (cb: (state: T, action: Action<U, R[U]>, oldState: T) => void) => void;
    task: (generator: (flowContext: FlowContext<T, R, U>) => Generator<any, any, any>) => (flowContext: FlowContext<T, R, U>) => Generator<any, any, any>;
    addFlow: (name: string, generator: (flowContext: FlowContext<T, R, U>) => Generator<any, any, any>) => void;
    runFlows(): void;
    runFlow(flow: (ctx: any) => Generator): any;
    runFlow(name: string): any;
    subscribe: (actionType: U, cb: (state: T, action: Action<U, R[U]>, oldState: T) => void) => () => void;
    private callFunctions;
    publish: (type: U, payload?: R[U], custom?: any) => Promise<void>;
}
