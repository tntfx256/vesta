import {IExtProjectConfig, IProjectConfig, ProjectType} from "../ProjectGen";
import {Log} from "../../util/Log";
import {readJsonFile, remove, writeFile} from "../../util/FsUtil";
import {existsSync} from "fs";
import {clone} from "../../util/Util";

export interface IVestaVersion {
    platform: number;
    api: string;
}

export interface IVesta {
    version: IVestaVersion;
    config: IProjectConfig;
}

export class Vesta {
    private static instance: Vesta;
    private vesta: IVesta;
    private path = 'package.json';
    private oldPath = 'vesta.json';
    private isUpdate: boolean = false;

    constructor(private config?: IProjectConfig) {
        if (config) {
            // creating new project
            this.vesta = {
                version: {
                    platform: 2,
                    api: 'v1'
                },
                config: config
            };
        } else {
            this.isUpdate = true;
            try {
                let update = false;
                if (existsSync(this.oldPath)) {
                    this.vesta = readJsonFile<any>(this.oldPath);
                    update = true;
                } else {
                    const packageData = readJsonFile<any>(this.path);
                    if ('vesta' in packageData) {
                        this.vesta = packageData.vesta;
                    } else {
                        Log.error('`vesta.json` not found. Make sure you are in the correct directory');
                    }
                }
                if (!existsSync(this.path)) {
                    Log.error('`package.json` not found. Make sure you are in the correct directory');
                    process.exit();
                }
                update && this.generate();
            } catch (e) {
                Log.error(e);
                process.exit();
            }
        }
    }

    public generate() {
        const packageData = readJsonFile<any>(this.path);
        packageData.vesta = this.vesta;
        try {
            // adding platform config to package.json
            writeFile(this.path, JSON.stringify(packageData, null, 2));
            // removing vesta.json
            remove(this.oldPath);
        } catch (e) {
        }
    }

    public getConfig(): IProjectConfig {
        return this.vesta.config;
    }

    public getVersion(): IVestaVersion {
        return this.vesta.version;
    }

    public get isClientApplication(): boolean {
        return this.vesta.config.type == ProjectType.ClientApplication;
    }

    public get isAdminPanel(): boolean {
        return this.vesta.config.type == ProjectType.AdminPanel;
    }

    public get isApiServer(): boolean {
        return this.vesta.config.type == ProjectType.ApiServer;
    }

    public get cmnDirectory(): string {
        return this.vesta.config.type == ProjectType.ApiServer ? 'src/cmn' : 'src/client/app/cmn';
    }

    public static getInstance(config?: IExtProjectConfig): Vesta {
        if (!Vesta.instance) {
            const newConfig = clone(config);
            delete newConfig.name;
            Vesta.instance = new Vesta(config);
        }
        return Vesta.instance;
    }
}
