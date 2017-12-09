import {Vesta} from "../file/Vesta";
import {IExtProjectConfig} from "../ProjectGen";
import {GitGen} from "../file/GitGen";
import {PlatformConfig} from "../../PlatformConfig";

export interface IServerAppConfig {
}

export class ServerAppGen {
    private vesta: Vesta;

    constructor(private config: IExtProjectConfig) {
        this.vesta = Vesta.getInstance();
    }

    private cloneTemplate() {
        let dir = this.config.name;
        GitGen.clone(PlatformConfig.getRepository().api, dir, 'master');
    }

    public generate() {
        return this.cloneTemplate();
    }
}
