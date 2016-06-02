import * as inquirer from "inquirer";
import {INGInjectable, NGDependencyInjector} from "./NGDependencyInjector";
import {BaseNGControllerGen} from "./controller/BaseNGControllerGen";
import {ControllerGenFactory} from "./controller/NGControllerGenFactory";
import {Vesta} from "../../../file/Vesta";
import {ModelGen} from "../../ModelGen";

export interface INGControllerConfig {
    name:string;
    module:string;
    model:string;
    injects:Array<INGInjectable>;
    openFormInModal?:boolean;
}

export class NGControllerGen {
    private controller:BaseNGControllerGen;

    constructor(private config:INGControllerConfig) {
        var framework = Vesta.getInstance().getConfig().client.framework;
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

    static getGeneratorConfig(name:string, callback) {
        var models = Object.keys(ModelGen.getModelsList()),
            config:INGControllerConfig = <INGControllerConfig>{};
        config.openFormInModal = false;
        config.module = '';
        if(name) {
            inquirer.prompt({name: 'module', type: 'input', message: 'Module Name: '}, answer => {
                if (answer['module']) {
                    config.module = answer['module'];
                }
                NGDependencyInjector.getCliInjectables([{name: '$scope', isLib: true}])
                    .then(injectables => {
                        config.injects = injectables;
                        if (models.length) {
                            models.splice(0, 0, 'None');
                            return inquirer.prompt({
                                name: 'model',
                                type: 'list',
                                message: 'Model: ',
                                choices: models,
                                default: 'None'
                            }, answer=> {
                                if (answer['model'] != 'None') {
                                    config.model = answer['model'];
                                }
                                callback(config);
                            });
                        }
                        callback(config);
                    });
            });
        }else{
            inquirer.prompt({name: 'module', type: 'input', message: 'Module Name: '}, answer => {
                if (answer['module']) {
                    config.module = answer['module'];
                }
                NGDependencyInjector.getCliInjectables([{name: '$scope', isLib: true}])
                    .then(injectables => {
                        config.injects = injectables;
                        if (models.length) {
                            models.splice(0, 0, 'None');
                            return inquirer.prompt({
                                name: 'model',
                                type: 'checkbox',
                                message: 'Model: ',
                                choices: models,
                                default: 'None'
                            }, answer=> {
                                if (answer['model'] != 'None') {
                                    config.model = answer['model'];
                                }
                                callback(config);
                            });
                        }
                        callback(config);
                    });
            });
        }
    }
}
