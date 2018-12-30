import { GitGen } from "../gen/file/GitGen";
import { Vesta } from "../gen/file/Vesta";
import { ArgParser } from "../util/ArgParser";
import { Log } from "../util/Log";
import { kebabCase } from "../util/StringUtil";

export class Eject {

    public static help() {
        Log.write(`
Usage: vesta eject <MODULE>

This will clone the original source code of the module into your project
so you can modify the source code of these modules

Options:
    -h,--help           Display this help

Example:
        vesta eject components
        vesta eject services
`);
    }

    public static init() {
        const argParser = ArgParser.getInstance();
        if (argParser.hasHelp()) {
            return Eject.help();
        }
        const module = argParser.get();
        if (module) {
            (new Eject(module)).eject();
        }
    }

    private module: string;
    private clientmodules = [
        "components", "services", "theme",
    ];
    private apiModules = [
        "driver-mysql", "driver-mssql", "driver-oracle", "driver-mongodb",
    ];
    private cmnModules = [
        "core", "culture", "culture-ir", "culture-us",
    ];

    public constructor(module: string) {
        this.module = kebabCase(module).toLowerCase();

        const allModules = this.clientmodules.concat(this.cmnModules).concat(this.apiModules);
        if (allModules.indexOf(this.module) <= 0) {
            throw new Error(`Unknown module ${module}`);
        }
    }

    public eject() {
        const url = `https://github.com/vestaBoot/vesta-${this.module}.git`;
        let path = `${Vesta.directories.app}/vesta/module`;
        if (this.isCmn) {
            path = `${Vesta.directories.cmn}/vesta/module`;
        }

        try {
            GitGen.clone(url, path);
        } catch (e) {
            Log.error("Check network connection", true);
        }

        Log.warning(`
    Do not forget to add the followin alias to webpack config
        '"@vesta/${this.module}": ${path}'

Please create an issue and let us know of the reason
        `);
    }

    private isCmn() {
        if (this.cmnModules.indexOf(this.module) >= 0) {
            return true;
        }
        return false;
    }
}
