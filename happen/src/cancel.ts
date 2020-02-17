export default class CancellationSource {
  isCancelled: boolean = false;

  private eventHandlers: ((unsub: Function) => void)[] = [];

  cancel() {
    this.isCancelled = true;
    //mapping the handlers to get a copy of the array
    this.eventHandlers
      .map(x => x)
      .forEach(f => {
        f(this.createUnsubFunction(f));
      });
  }

  private createUnsubFunction(f: (unsub: Function) => void) {
    return () => this.eventHandlers.splice(this.eventHandlers.indexOf(f), 1);
  }

  removeEventHandler(f: (unsub: Function) => void) {
    this.createUnsubFunction(f)();
  }

  addEventHandler(f: (unsub: Function) => void) {
    const unsub = this.createUnsubFunction(f);
    if (this.isCancelled) f(unsub);
    else this.eventHandlers.push(f);
    return unsub;
  }
}
