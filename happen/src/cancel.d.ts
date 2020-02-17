export default class CancellationSource {
    isCancelled: boolean;
    private eventHandlers;
    cancel(): void;
    private createUnsubFunction;
    removeEventHandler(f: (unsub: Function) => void): void;
    addEventHandler(f: (unsub: Function) => void): () => ((unsub: Function) => void)[];
}
