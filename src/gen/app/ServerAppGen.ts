import {Vesta} from "../file/Vesta";
import {IProjectConfig} from "../ProjectGen";
import {GitGen} from "../file/GitGen";
import {PlatformConfig} from "../../PlatformConfig";

export interface IServerAppConfig {
    type: string;
    database: string;
}

export class ServerAppGen {
    private vesta: Vesta;

    constructor(private config: IProjectConfig) {
        this.vesta = Vesta.getInstance();
    }

    private cloneTemplate() {
        let dir = this.config.name;
        GitGen.clone(PlatformConfig.getRepository().api, dir, 'master');
        GitGen.cleanClonedRepo(dir);
    }

    public generate() {
        return this.cloneTemplate();
    }

    static getGeneratorConfig(): Promise<IServerAppConfig> {
        return Promise.resolve(<IServerAppConfig>{type: 'express'});
    }
}
