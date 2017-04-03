import {ClientAppGen} from "./ClientAppGen";
import {IProjectConfig} from "../../ProjectGen";

export class IonicAppGen extends ClientAppGen {

    constructor(protected config: IProjectConfig) {
        super(config);
    }
}
