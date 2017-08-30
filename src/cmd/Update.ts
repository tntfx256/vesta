import * as fs from "fs";
import {Log} from "../util/Log";
import {ArgParser} from "../util/ArgParser";
import {readJsonFile} from "../util/FsUtil";
import {execute} from "../util/CmdUtil";

export class Update {

    static init() {
        const argParser = ArgParser.getInstance();
        if (argParser.hasHelp()) {
            return Update.help();
        }
        try {
            let content = readJsonFile<any>(`package.json`);
            let isDev = argParser.has('--dev');
            let pkgKeyName = isDev ? 'devDependencies' : 'dependencies';
            let allPackages = Object.keys(content[pkgKeyName]);
            let pkgs = isDev || argParser.has('--all') ? allPackages : allPackages.filter(pkg => pkg.search(/^vesta-/i) >= 0);
            pkgs.forEach(pkg => delete content[pkgKeyName][pkg]);
            fs.writeFileSync(`package.json`, JSON.stringify(content, null, 2), {encoding: 'utf8'});
            execute(`npm install --save${isDev ? '-dev' : ''} ${pkgs.join(' ')}`);
        } catch (err) {
            Log.error(err);
        }
    }

    static help() {
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