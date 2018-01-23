import { existsSync } from "fs";
import { join } from "path";
import { readJsonFile, remove, writeFile } from "../../util/FsUtil";
import { Log } from "../../util/Log";
import { clone } from "../../util/Util";
import { IProjectConfig, ProjectType } from "../ProjectGen";

export interface IVestaVersion {
    api: string;
    platform: number;
}

export interface IVesta {
    config: IProjectConfig;
    version: IVestaVersion;
}

export class Vesta {
    private static instance: Vesta;
    private isUpdate: boolean = false;
    private oldPath = "vesta.json";
    private path = "package.json";
    private vesta: IVesta;

    public static getInstance(config?: IProjectConfig): Vesta {
        if (!Vesta.instance) {
            const cfg = config;
            // try {
            //     const newConfig = clone(config);
            //     delete newConfig.name;
            // } catch (e) { }
            Vesta.instance = new Vesta(cfg);
        }
        return Vesta.instance;
    }

    constructor(config?: IProjectConfig) {
        if (config) {
            // creating new project
            this.vesta = { config: clone(config), version: { api: "v1", platform: 2 } };
        } else {
            this.isUpdate = true;
            try {
                let update = false;
                if (existsSync(this.oldPath)) {
                    this.vesta = readJsonFile<any>(this.oldPath);
                    update = true;
                } else {
                    const packageData = readJsonFile<any>(this.path);
                    if ("vesta" in packageData) {
                        this.vesta = packageData.vesta;
                    } else {
                        Log.error("`vesta.json` not found. Make sure you are in the correct directory");
                    }
                }
                if (!existsSync(this.path)) {
                    Log.error("`package.json` not found. Make sure you are in the correct directory");
                    process.exit();
                }
                if (update) {
                    this.generate();
                }
            } catch (e) {
                Log.error(e);
                process.exit();
            }
        }
    }

    public generate(directory?: string) {
        const packagePath = join(directory, this.path);
        const packageData = readJsonFile<any>(packagePath);
        if (!packageData) {
            process.exit();
        }
        delete (this.vesta.version as any).app;
        delete (this.vesta.config as any).name;
        packageData.vesta = this.vesta;
        try {
            // adding platform config to package.json
            writeFile(packagePath, JSON.stringify(packageData, null, 2));
            // removing vesta.json
            remove(this.oldPath);
        } catch (e) {
            Log.error(e);
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
        return this.vesta.config.type == ProjectType.ApiServer ? "src/cmn" : "src/client/app/cmn";
    }
}
