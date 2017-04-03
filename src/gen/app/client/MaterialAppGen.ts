import {ClientAppGen} from "./ClientAppGen";
import {IProjectConfig} from "../../ProjectGen";

export class MaterialAppGen extends ClientAppGen {

    constructor(protected config: IProjectConfig) {
        super(config);
    }
}
