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

export interface IStructure {
    app: string;
    cmn: string;
    components: string;
    controllers?: string;
    model: string;
    sass: string;
}

export class Vesta {

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

    private static instance: Vesta;
    private dirs: IStructure;
    private isUpdate: boolean = false;
    private oldPath = "vesta.json";
    private path = "package.json";
    private vesta: IVesta;

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
                        Log.error("`vesta` not found in `package.json` file. Make sure you are in the correct directory", true);
                    }
                }
                if (!existsSync(this.path)) {
                    Log.error("`package.json` not found. Make sure you are in the correct directory", true);
                }
                if (update) {
                    this.generate();
                }
            } catch (e) {
                Log.error(e);
                process.exit();
            }
        }
        this.setStructures();
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
        return this.vesta.config.type === ProjectType.ClientApplication;
    }

    public get isApiServer(): boolean {
        return this.vesta.config.type === ProjectType.ApiServer;
    }

    public get directories(): IStructure {
        return this.dirs;
    }

    private setStructures() {
        this.dirs = {} as IStructure;
        if (existsSync(`${__dirname}/src/client/app`)) {
            this.dirs = {
                app: "src/client/app",
                cmn: "src/client/app/cmn",
                components: "src/client/app/components",
                model: "src/client/app/cmn/models",
                sass: "src/client/app/scss",
            };
        } else if (existsSync(`${__dirname}/src/app`)) {
            this.dirs = {
                app: "src/app",
                cmn: "src/app/cmn",
                components: "src/app/components",
                model: "src/app/cmn/models",
                sass: "src/app/scss",
            };
        } else if (existsSync(`${__dirname}/src/cmn`)) {
            this.dirs = {
                app: "src",
                cmn: "src/cmn",
                components: "src/components",
                model: "src/cmn/models",
                sass: "src/components",
            };
        }
        const apiVersion = this.getVersion().api;
        this.dirs.controllers = `src/api/${apiVersion}/controller`;
    }
}
