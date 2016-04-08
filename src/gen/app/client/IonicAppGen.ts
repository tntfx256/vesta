import * as fs from 'fs-extra';
import {ClientAppGen} from "./ClientAppGen";
import {Vesta} from "../../file/Vesta";
import {IProjectGenConfig} from "../../ProjectGen";
import {TsFileGen} from "../../core/TSFileGen";

export class IonicAppGen extends ClientAppGen {

    constructor(protected config:IProjectGenConfig) {
        super(config);
    }
}
