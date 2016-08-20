import {ClientAppGen} from "./ClientAppGen";
import {IProjectGenConfig} from "../../ProjectGen";

export class MaterialAppGen extends ClientAppGen {

    constructor(protected config: IProjectGenConfig) {
        super(config);
    }
}
