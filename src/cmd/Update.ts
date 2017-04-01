import * as fs from "fs";
import {CmdUtil} from "../util/CmdUtil";
import {Vesta} from "../gen/file/Vesta";
import {Log} from "../util/Log";

export class Update {

    static parse(args: Array<string>) {
        if (['-h', '--help', 'help'].indexOf(args[0]) >= 0) {
            return Update.help();
        }
        Update.updatePackages(args);
    }

    public static updatePackages(args: Array<string>) {
        try {
            let pkgManager = Vesta.getInstance().getConfig().pkgManager;
            let content = JSON.parse(fs.readFileSync(`package.json`, {encoding: 'utf8'}));
            let isDev = args.indexOf('--dev') >= 0;
            let pkgKeyName = isDev ? 'devDependencies' : 'dependencies';
            let allPackages = Object.keys(content[pkgKeyName]);
            let pkgs = isDev || args.indexOf('--all') >= 0 ? allPackages : allPackages.filter(pkg => pkg.search(/^vesta-/i) >= 0);
            pkgs.forEach(pkg => delete content[pkgKeyName][pkg]);
            fs.writeFileSync(`package.json`, JSON.stringify(content, null, 2), {encoding: 'utf8'});
            if (pkgManager == "yarn") {
                CmdUtil.execSync(`yarn add ${isDev ? '--dev' : ''} ${pkgs.join(' ')}`);
            } else {
                CmdUtil.execSync(`npm install --save${isDev ? '-dev' : ''} ${pkgs.join(' ')}`);
            }
        } catch (err) {
            Log.error(err);
        }
    }

    static help() {
        process.stdout.write(`
Usage: vesta update [options...]

Updates a package to it's latest version

Options:
    --all   Update all npm packages (dependencies)
    --dev   Update all npm packages (devDependencies)
    
Without any options, it will only update all vesta packages
`);
    }
}