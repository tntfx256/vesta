import {ClientAppGen} from "../../../../app/client/ClientAppGen";
import {MaterialControllerGen} from "./MaterialControllerGen";
import {IonicControllerGen} from "./IonicControllerGen";
import {BaseNGControllerGen} from "./BaseNGControllerGen";
import {INGControllerConfig} from "../NGControllerGen";

export class ControllerGenFactory {
    public static create(framework, config: INGControllerConfig): BaseNGControllerGen {
        switch (framework) {
            case ClientAppGen.Framework.Material:
                return new MaterialControllerGen(config);
            case ClientAppGen.Framework.Ionic:
                return new IonicControllerGen(config);
        }
        return null;
    }
}