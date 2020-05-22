import { existsSync } from "fs-extra";
import { execute, getOutputOf } from "./CmdUtil";
import { readJsonFile } from "./FsUtil";

export type PackageManagerType = "npm" | "yarn";

export class PackageManager {
  public static getManager(): PackageManagerType {
    let pkgManager: PackageManagerType = "npm";
    try {
      getOutputOf(`yarn --version`);
      pkgManager = "yarn";
    } catch {
      //
    }
    // check if package-lock.json exists
    if (pkgManager === "yarn" && existsSync("package-lock.json") && !existsSync("yarn.lock")) {
      pkgManager = "npm";
    }
    return pkgManager;
  }

  public static install(packages: string[], isDev: boolean = false) {
    if (!packages.length) {
      return;
    }
    const manager = this.getManager();
    const command = PackageManager.commandMap.install[manager];
    const type = isDev ? PackageManager.commandMap.dev[manager] : "";
    try {
      execute(`${command} ${type} ${packages.join(" ")}`);
    } catch (err) {
      //
    }
  }

  public static uninstall(...packages: string[]) {
    if (!packages.length) {
      return;
    }
    const command = PackageManager.commandMap.uninstall[this.getManager()];
    execute(`${command} ${packages.join(" ")}`);
  }

  public static has(...packages: string[]): boolean {
    if (!packages.length) {
      return true;
    }
    const content = readJsonFile<any>(`package.json`);
    return (
      Object.keys(content.devDependencies || {})
        .concat(Object.keys(content.dependencies))
        .filter((pkg) => packages.indexOf(pkg) >= 0).length === packages.length
    );
  }

  private static commandMap = {
    dev: {
      npm: "--save-dev",
      yarn: "--dev",
    },
    install: {
      npm: "npm install",
      yarn: "yarn add",
    },
    uninstall: {
      npm: "npm uninstall",
      yarn: "yarn remove",
    },
  };
}
