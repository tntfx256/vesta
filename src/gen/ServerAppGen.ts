import { PlatformConfig } from "../PlatformConfig";
import { GitGen } from "./GitGen";
import { IExtProjectConfig } from "./ProjectGen";

export interface IServerAppConfig {
}

export class ServerAppGen {

    constructor(private config: IExtProjectConfig) {
    }

    public generate() {
        return this.cloneTemplate();
    }

    private cloneTemplate() {
        const dir = this.config.name;
        GitGen.clone(PlatformConfig.getRepository().api, dir, "master");
    }
}
