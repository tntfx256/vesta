import * as fs from "fs-extra";
import {IProjectGenConfig} from "../ProjectGen";
import {IProjectConfig, Config} from "../../Config";
import {FsUtil} from "../../util/FsUtil";
import {Log} from "../../util/Log";

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
                    Log.error('`vesta.json` not found. Make sure you are in the correct directory');
                    process.exit();
                }
                this.json = JSON.parse(fs.readFileSync(this.path, {encoding: 'utf8'}));
            } catch (e) {
                Log.error(e);
                process.exit();
            }
        }
    }

    public generate() {
        if (this.isUpdate) {
            Log.error('Invalid operation');
        } else {
            FsUtil.writeFile(`${this.config.name}/vesta.json`, JSON.stringify(this.json, null, 2));
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
