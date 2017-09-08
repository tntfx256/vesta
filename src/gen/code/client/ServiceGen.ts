import {ArgParser} from "../../../util/ArgParser";
import {Log} from "../../../util/Log";
import {fcUpper} from "../../../util/StringUtil";
import {mkdir} from "../../../util/FsUtil";
import {writeFileSync} from "fs";

export interface ServiceGenConfig {
    name: string;
}

export class ServiceGen {
    private className: string;
    private path = 'src/client/app/service/';

    constructor(private config: ServiceGenConfig) {
        this.className = fcUpper(config.name);
        mkdir(this.path);
    }

    public generate() {
        let className = `${this.className}Service`;
        let code = `export class ${className} {
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

    static init() {
        const argParser = ArgParser.getInstance();
        let config: ServiceGenConfig = <ServiceGenConfig>{
            name: argParser.get()
        };
        if (!config.name) {
            Log.error("Missing/Invalid service name\nSee 'vesta gen service --help' for more information\n");
            return;
        }
        (new ServiceGen(config)).generate();
    }

    static help() {
        Log.write(`
Usage: vesta gen service <NAME> 

Creating service provider 

    NAME        The name of the service
    
Example:
    vesta gen service test
`);
    }
}