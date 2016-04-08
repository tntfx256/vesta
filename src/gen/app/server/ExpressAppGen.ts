import * as fs from 'fs-extra';
import * as path from 'path';
import {IServerAppConfig} from "../ServerAppGen";
import {Util} from "../../../util/Util";
import {Vesta} from "../../file/Vesta";
import {DatabaseGen} from "../../core/DatabaseGen";
import {IProjectGenConfig} from "../../ProjectGen";

export class ExpressAppGen {
    private vesta:Vesta;

    constructor(private config:IProjectGenConfig) {
        this.vesta = Vesta.getInstance();
    }
}
