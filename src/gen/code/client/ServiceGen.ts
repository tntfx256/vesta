import { writeFileSync } from "fs";
import { ArgParser } from "../../../util/ArgParser";
import { mkdir } from "../../../util/FsUtil";
import { Log } from "../../../util/Log";
import { fcUpper } from "../../../util/StringUtil";
import { Vesta } from "../../file/Vesta";

export interface IServiceGenConfig {
    name: string;
}

export class ServiceGen {

    public static help() {
        Log.write(`
Usage: vesta gen service <NAME>

Creating service provider

    NAME        The name of the service

Example:
    vesta gen service test
`);
    }

    public static init() {
        const argParser = ArgParser.getInstance();
        const config: IServiceGenConfig = {
            name: argParser.get(),
        } as IServiceGenConfig;
        if (!config.name) {
            Log.error("Missing/Invalid service name\nSee 'vesta gen service --help' for more information\n");
            return;
        }
        (new ServiceGen(config)).generate();
    }

    private className: string;
    private path = "src/client/app/service/";

    constructor(private config: IServiceGenConfig) {
        this.path = `${Vesta.getInstance().directories.app}/service/`;
        this.className = fcUpper(config.name);
        mkdir(this.path);
    }

    public generate() {
        const className = `${this.className}Service`;
        const code = `export class ${className} {
    private static instance: ${className};

    constructor() {
    }

    public static getInstance(): ${className} {
        if (!${className}.instance) {
            ${className}.instance = new ${className}();
        }
        return ${className}.instance;
    }
}`;
        writeFileSync(`${this.path}${this.className}Service.ts`, code);
    }
}
