import * as fs from "fs-extra";
import * as path from "path";
import * as _ from "lodash";
import {Question} from "inquirer";
import {XMLGen} from "../../../core/XMLGen";
import {Vesta} from "../../../file/Vesta";
import {BaseNgFormGen} from "./form/BaseNgFormGen";
import {MaterialFormGen} from "./form/MaterialFormGen";
import {ModelGen} from "../../ModelGen";
import {EmptyFormGen} from "./form/EmptyFormGen";
import {ClientAppGen} from "../../../app/client/ClientAppGen";
import {IonicFormGen} from "./form/IonicFormGen";
import {FsUtil} from "../../../../util/FsUtil";
import {Log} from "../../../../util/Log";
import {IModel} from "vesta-schema/Model";
import {Schema} from "vesta-schema/Schema";
import {Util} from "../../../../util/Util";

export interface INGFormConfig {
    name:string;
    model:string;
    module:string;
    openFormInModal:boolean;
    writeToFile?:boolean;
}

export interface INGFormWrapperConfig {
    type:string;
    isModal:boolean;
    formPath:string;
    title:string;
    ok:string;
    cancel:string;
}

export class NGFormGen {

    static Type = {Add: 'add', Edit: 'edit'};

    private vesta:Vesta;
    private model:IModel;
    private schema:Schema;
    private form:BaseNgFormGen;
    private path:string = 'src/app/templates';

    constructor(private config:INGFormConfig) {
        this.vesta = Vesta.getInstance();
        this.model = ModelGen.getModel(config.model);
        if (this.model) {
            this.schema = this.model.schema;
            let projectConfig = this.vesta.getConfig();
            switch (projectConfig.client.framework) {
                case ClientAppGen.Framework.Material:
                    this.form = new MaterialFormGen(this.model);
                    break;
                case ClientAppGen.Framework.Ionic:
                    this.form = new IonicFormGen(this.model);
                    break;
            }
            this.path = path.join(this.path, config.module, _.camelCase(this.schema.name));
        } else {
            Log.error(`Model file was not found. You have to run gulp task first.`);
            this.form = new EmptyFormGen(null);
        }
        try {
            fs.mkdirpSync(this.path);
        } catch (e) {
        }
    }

    generate() {
        if (!this.model) return;
        let code = this.form.generate();
        if (this.config.writeToFile) FsUtil.writeFile(path.join(this.path, 'form.html'), code);
        return code;
    }

    wrap(config:INGFormWrapperConfig):XMLGen {
        return this.form.wrap(config);
    }

    static getGeneratorConfig(callback) {
        let models = Object.keys(ModelGen.getModelsList()),
            config:INGFormConfig = <INGFormConfig>{};
        config.module = '';

        let qs:Array<Question> = [
            {name: 'module', type: 'input', message: 'Module Name: '}
        ];
        if (models.length) {
            qs.push({name: 'model', type: 'list', message: 'Model: ', choices: models, default: models[0]});
            qs.push({name: 'modal', type: 'confirm', message: 'Show in modal: ', default: true});
        } else {
            return Log.error('There is no model to generate form upon');
        }
        Util.prompt<{module:string; model:string; modal:boolean;}>(qs)
            .then(answer => {
                if (answer.module) {
                    config.module = answer.module;
                }
                config.model = answer.model;
                config.openFormInModal = answer.modal;
                callback(config);
            })
    }
}
