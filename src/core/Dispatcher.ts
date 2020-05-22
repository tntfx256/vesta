export type DispatcherCallBack<T> = (payload: T) => boolean | void;

type DispatcherRegistry<T> = {
  [eventName: string]: DispatcherCallBack<T>[];
};

export class Dispatcher {
  public static getInstance(): Dispatcher {
    if (!Dispatcher.instance) {
      Dispatcher.instance = new Dispatcher();
    }
    return Dispatcher.instance;
  }

  private static instance: Dispatcher;

  private registry: DispatcherRegistry<any> = {};

  private constructor() {
    //
  }

  public dispatch = <T>(eventName: string, payload: T) => {
    if (!this.registry[eventName]) {
      return;
    }
    for (let i = 0, il = this.registry[eventName].length; i < il; ++i) {
      this.registry[eventName][i](payload);
    }
  };

  public register<T>(eventName: string, callback: DispatcherCallBack<T>) {
    if (!this.registry[eventName]) {
      this.registry[eventName] = [];
    }
    this.registry[eventName].push(callback);
  }

  public unregister(eventName: string, callback: any): boolean {
    if (!this.registry[eventName]) {
      return true;
    }
    for (let i = this.registry[eventName].length; i--; ) {
      if (this.registry[eventName][i] === callback) {
        this.registry[eventName].splice(i, 1);
        break;
      }
    }
    return true;
  }
}
