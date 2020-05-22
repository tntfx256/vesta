export class Registry {
  public static getPrivateStorage(name: string) {
    if (!(name in Registry.privateStorage)) {
      Registry.privateStorage[name] = {};
    }

    return {
      set: <T>(key: string, value: T): void => {
        Registry.privateStorage[key] = value;
      },
      get: <T>(key: string, defaultValue?: T): T | null => {
        if (key in Registry.storage) {
          return Registry.storage[key];
        }
        return defaultValue || null;
      },
    };
  }

  public static set<T>(key: string, value: T): void {
    Registry.storage[key] = value;
  }

  public static get<T>(key: string, defaultValue?: T): T | null {
    if (key in Registry.storage) {
      return Registry.storage[key];
    }
    return defaultValue || null;
  }

  private static storage: any = {};

  private static privateStorage: any = {};

  private constructor() {
    //
  }
}
