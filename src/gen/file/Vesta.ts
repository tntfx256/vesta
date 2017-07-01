import * as fs from "fs-extra";
import {IProjectConfig, ProjectType} from "../ProjectGen";
import {Log} from "../../util/Log";
import {writeFile} from "../../util/FsUtil";

export interface IProjectVersion {
    app: string;
    api: string;
    platform?: number;
}

export interface IVesta {
    version: IProjectVersion;
    config: IProjectConfig;
}

export class Vesta {
    private static instance: Vesta;
    private vesta: IVesta;
    private path = 'vesta.json';
    private isUpdate: boolean = false;
    // private v2 = false;

    constructor(private config?: IProjectConfig) {
        if (config) {// creating new project
            // this.v2 = true;
            this.vesta = {
                version: {app: '0.1.0', api: 'v1', platform: 2},
                config: config
            };
        } else {
            this.isUpdate = true;
            try {
                if (!fs.existsSync(this.path)) {
                    Log.error('`vesta.json` not found. Make sure you are in the correct directory');
                    process.exit();
                }
                this.vesta = JSON.parse(fs.readFileSync(this.path, {encoding: 'utf8'}));
                // let platform = this.vesta.version.platform;
                // this.v2 = platform && platform > 1;
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
            writeFile(`${this.config.name}/vesta.json`, JSON.stringify(this.vesta, null, 2));
        }
    }

    public getConfig(): IProjectConfig {
        return this.vesta.config;
    }

    public getVersion(): IProjectVersion {
        return this.vesta.version;
    }

    // public get isV2() {
    //     return this.v2;
    // }

    public get isClientApplication(): boolean {
        return this.vesta.config.type == ProjectType.ClientApplication;
    }

    public get isControlPanel(): boolean {
        return this.vesta.config.type == ProjectType.ControlPanel;
    }

    public get isApiServer(): boolean {
        return this.vesta.config.type == ProjectType.ApiServer;
    }

    public get cmnDirectory(): string {
        return this.vesta.config.type == ProjectType.ApiServer ? 'src/cmn' : 'src/client/app/cmn';
    }

    public static getInstance(config?: IProjectConfig): Vesta {
        if (!Vesta.instance) {
            Vesta.instance = new Vesta(config);
        }
        return Vesta.instance;
    }
}
