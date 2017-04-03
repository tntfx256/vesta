import {IProjectConfig} from "../ProjectGen";
import {ClientAppGen} from "./client/ClientAppGen";
import {MaterialAppGen} from "./client/MaterialAppGen";
import {IonicAppGen} from "./client/IonicAppGen";
export class ClientAppGenFactory {

    static create(config: IProjectConfig): ClientAppGen {
        switch (config.client.framework) {
            case ClientAppGen.Framework.Material:
                return new MaterialAppGen(config);
            case ClientAppGen.Framework.Ionic:
                return new IonicAppGen(config);
        }
        return null;
    }
}