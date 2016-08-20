import {ClientAppGen} from "./ClientAppGen";
import {IProjectGenConfig} from "../../ProjectGen";

export class IonicAppGen extends ClientAppGen {

    constructor(protected config: IProjectGenConfig) {
        super(config);
    }
}
