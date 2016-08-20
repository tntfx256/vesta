import {Vesta} from "../gen/file/Vesta";

export class Update {

    static parse(args: Array<string>) {
        if (!args.length || ['-h', '--help', 'help'].indexOf(args[0]) >= 0) {
            return Update.help();
        }
        Vesta.updatePackages(args);
    }

    static help() {
        process.stdout.write(`
Usage: vesta update [options...]

Updates a package to it's latest version

Options:
    --all   Update all npm packages (dependencies)
    --dev   Update all npm packages (devDependencies)
    --tsd   Generates a sass file for a page (only sass type)
    
Without any options, it will only update all vesta packages
`);
    }
}