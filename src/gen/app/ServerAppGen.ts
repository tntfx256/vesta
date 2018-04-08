import { PlatformConfig } from "../../PlatformConfig";
import { GitGen } from "../file/GitGen";
import { Vesta } from "../file/Vesta";
import { IExtProjectConfig } from "../ProjectGen";

export interface IServerAppConfig {
}

export class ServerAppGen {
    private vesta: Vesta;

    constructor(private config: IExtProjectConfig) {
        this.vesta = Vesta.getInstance();
    }

    public generate() {
        return this.cloneTemplate();
    }

    private cloneTemplate() {
        const dir = this.config.name;
        GitGen.clone(PlatformConfig.getRepository().api, dir, "master");
    }
}
