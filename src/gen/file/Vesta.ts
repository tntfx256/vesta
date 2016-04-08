import * as fs from "fs-extra";
import {IProjectGenConfig} from "../ProjectGen";
import {Util} from "../../util/Util";
import {IProjectConfig, Config} from "../../Config";

export interface IProjectVersion {
    app:string;
    api:string;
}

export interface IVesta {
    version:IProjectVersion;
    config:IProjectGenConfig;
}

export class Vesta {

    private static instance:Vesta;
    private json:IVesta;
    private path = 'vesta.json';
    private isUpdate:boolean = false;
    private static projectConfig:IProjectConfig = Config;

    constructor(private config:IProjectGenConfig = null) {
        if (config) {
            this.json = {
                version: {app: '0.1.0', api: 'v1'},
                config: config
            };
        } else {
            this.isUpdate = true;
            try {
                if (!fs.existsSync(this.path)) {
                    Util.log.error('`vesta.json` not found. Make sure you are in the correct directory');
                    process.exit();
                }
                this.json = JSON.parse(fs.readFileSync(this.path, {encoding: 'utf8'}));
            } catch (e) {
                Util.log.error(e);
                process.exit();
            }
        }
    }

    public generate() {
        if (this.isUpdate) {
            Util.log.error('Invalid operation');
        } else {
            var path = this.config.name;
            delete this.config.repository['firstTime'];
            Util.fs.writeFile(path + '/vesta.json', JSON.stringify(this.json));
        }
    }

    public static getInstance(config:IProjectGenConfig = null):Vesta {
        if (!Vesta.instance) {
            Vesta.instance = new Vesta(config);
        }
        return Vesta.instance;
    }

    public getConfig():IProjectGenConfig {
        return this.json.config;
    }

    public getProjectConfig():IProjectConfig {
        return Vesta.projectConfig;
    }

    public getVersion() {
        return this.json.version;
    }
}
