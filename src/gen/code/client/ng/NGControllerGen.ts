import {Question} from "inquirer";
import {INGInjectable, NGDependencyInjector} from "./NGDependencyInjector";
import {BaseNGControllerGen} from "./controller/BaseNGControllerGen";
import {ControllerGenFactory} from "./controller/NGControllerGenFactory";
import {Vesta} from "../../../file/Vesta";
import {ModelGen} from "../../ModelGen";
import {Err} from "vesta-util/Err";
import {Util} from "../../../../util/Util";

export interface INGControllerConfig {
    name:string;
    module:string;
    model:string;
    type:ControllerType;
    injects:Array<INGInjectable>;
    openFormInModal:boolean;
}

export enum ControllerType{List = 1, Add, Edit}

export class NGControllerGen {
    private controller:BaseNGControllerGen;

    constructor(private config:INGControllerConfig) {
        let framework = Vesta.getInstance().getConfig().client.framework;
        this.controller = ControllerGenFactory.create(framework, config);
    }

    public setAsAddController() {
        this.controller.setAsAddController();
    }

    public setAsEditController() {
        this.controller.setAsEditController();
    }

    public generate() {
        this.controller.generate();
    }

    static getGeneratorConfig(name:string):Promise<INGControllerConfig> {
        if (!name) return Promise.reject(new Err(Err.Code.WrongInput));
        let models = Object.keys(ModelGen.getModelsList()),
            config:INGControllerConfig = <INGControllerConfig>{};
        config.openFormInModal = true;
        config.type = ControllerType.List;
        config.module = '';
        return NGDependencyInjector.getCliInjectables([{name: '$scope', isLib: true}])
            .then(injectables => {
                config.injects = injectables;
                let qs:Array<Question> = [{name: 'module', type: 'input', message: 'Module Name: '}];
                if (models.length) {
                    qs.push({
                        name: 'model',
                        type: 'list',
                        message: 'Model: ',
                        choices: ['None'].concat(models),
                        default: 'None'
                    });
                }
                return Util.prompt<{module:string; model:string;}>(qs)
            })
            .then(answer => {
                config.module = answer.module;
                if (answer.model != 'None') {
                    config.model = answer.model;
                    return Util.prompt<{modal:boolean}>({
                        name: 'modal',
                        type: 'confirm',
                        message: 'Show forms in modal: ',
                        default: true
                    });
                }
                return {modal: true};
            })
            .then(answer=> {
                config.openFormInModal = answer.modal;
                return config;
            })
    }
}
