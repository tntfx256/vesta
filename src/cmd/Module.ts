import {Log} from "../util/Log";
import {ModuleGen} from "../gen/ModuleGen";
import {ArgParser} from "../util/ArgParser";

export class Module {

    private static createModule(name: string) {
        let module = new ModuleGen({name});
        module.generate();
    }

    static init() {
        const argParser = ArgParser.getInstance();
        if (argParser.hasHelp()) {
            return Module.help();
        }
        let name = argParser.get();
        if (!name || !name.match(/^[a-z][a-z0-9-]+$/i)) {
            return Log.error('Module name may only contains [letters, numbers, dash]');
        }
        Module.createModule(name);
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