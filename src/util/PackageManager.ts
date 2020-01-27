import { existsSync } from "fs-extra";
import { execute } from "./CmdUtil";

export type PackageManagerType = "npm" | "yarn";

export class PackageManager {
  public static getManager(): PackageManagerType {
    let pkgManager: PackageManagerType = "npm";
    try {
      execute(`yarn --version`, { silent: true });
      pkgManager = "yarn";
    } catch {
      //
    }
    // check if package-lock.json exists
    if (pkgManager === "yarn" && existsSync("package-lock.json")) {
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
    execute(`${command} ${type} ${packages.join(" ")}`);
  }

  public static uninstall(...packages: string[]) {
    if (!packages.length) {
      return;
    }
    const command = PackageManager.commandMap.uninstall[this.getManager()];
    execute(`${command} ${packages.join(" ")}`);
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
