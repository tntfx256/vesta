import { writeFileSync } from "fs";
import { ArgParser } from "../util/ArgParser";
import { readJsonFile } from "../util/FsUtil";
import { Log } from "../util/Log";
import { PackageManager } from "../util/PackageManager";

export class Update {
  public static init() {
    const argParser = ArgParser.getInstance();
    if (argParser.hasHelp()) {
      return Update.help();
    }
    try {
      const content = readJsonFile<any>(`package.json`);
      if (!content) {
        process.exit();
      }
      const isDev = argParser.has("--dev");
      const pkgKeyName = isDev ? "devDependencies" : "dependencies";
      const allPackages = Object.keys(content[pkgKeyName]);
      const pkgs = isDev || argParser.has("--all") ? allPackages : allPackages.filter(pkg => pkg.search(/^@?vesta/i) >= 0);
      pkgs.forEach(pkg => delete content[pkgKeyName][pkg]);
      writeFileSync(`package.json`, JSON.stringify(content, null, 2), {
        encoding: "utf8",
      });
      PackageManager.install(pkgs, isDev);
    } catch (err) {
      Log.error(err);
    }
  }

  public static help() {
    Log.write(`
Usage: vesta update [options...]

Updates a package to it's latest version

Options:
    --all   Update all npm packages (dependencies)
    --dev   Update all npm packages (devDependencies)

Without any options, it will only update all vesta packages
`);
  }
}
