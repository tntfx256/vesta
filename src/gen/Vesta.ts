import { existsSync } from "fs";
import { mkdir } from "../util/FsUtil";

export interface IStructure {
    app: string;
    cmn: string;
    components: string;
    controllers: string;
    model: string;
    sass: string;
    vesta: string;
}

export class Vesta {

    private static dirs: IStructure;

    public static get isClientApplication(): boolean {
        return !Vesta.isApiServer;
    }

    public static get isApiServer(): boolean {
        return existsSync(`${__dirname}/src/api`);
    }

    public static get directories(): IStructure {
        if (!Vesta.dirs) {
            Vesta.setStructures();
        }
        return Vesta.dirs;
    }

    private static setStructures() {
        Vesta.dirs = {} as IStructure;
        if (existsSync(`${__dirname}/src/client/app/cmn`)) {
            Vesta.dirs = {
                app: "src/client/app",
                cmn: "src/client/app/cmn",
                components: "src/client/app/components",
                controllers: `src/api/v1/controllers`,
                model: "src/client/app/cmn/models",
                sass: "src/client/app/scss",
                vesta: "vesta",
            };
        } else if (existsSync(`${__dirname}/src/app/cmn`)) {
            Vesta.dirs = {
                app: "src/app",
                cmn: "src/app/cmn",
                components: "src/app/components",
                controllers: `src/api/v1/controllers`,
                model: "src/app/cmn/models",
                sass: "src/app/scss",
                vesta: "vesta",
            };
        } else if (existsSync(`${__dirname}/src/cmn`)) {
            Vesta.dirs = {
                app: "src",
                cmn: "src/cmn",
                components: "src/components",
                controllers: `src/api/v1/controllers`,
                model: "src/cmn/models",
                sass: "src/components",
                vesta: "vesta",
            };
        } else {
            Vesta.dirs = {
                app: "src",
                cmn: "src/cmn",
                components: "src/components",
                controllers: `src/controllers`,
                model: "src/models",
                sass: "src/components",
                vesta: "vesta",
            };
        }
    }
}
