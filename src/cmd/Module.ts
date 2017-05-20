import {Log} from "../util/Log";
import {ModuleGen} from "../gen/ModuleGen";

export class Module {

    private static createModule(name: string) {
        if (name.length && !name.match(/^[a-z][a-z0-9-_]+$/i)) {
            return Log.error('projectName may only contains [letters, numbers, dash, underscore]');
        }
        let module = new ModuleGen({name});
        module.generate();
    }

    static parse(args: Array<string>) {
        if (['-h', '--help', 'help'].indexOf(args[0]) >= 0) {
            return Module.help();
        }
        Module.createModule(args.length ? args[0] : '');
    }

    static help() {
        Log.write(`
Usage: vesta module MODULE_NAME

Creating new module for vesta platform

    MODULE_NAME    The name of the module

Options:
    -h,--help       Display this help
`);
    }
}