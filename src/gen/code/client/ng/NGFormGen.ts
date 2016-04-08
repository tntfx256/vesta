import * as fs from 'fs-extra';
import * as path from 'path';
import * as _ from 'lodash';
import * as colors from 'colors';
import * as inquirer from 'inquirer';
import * as gulp from 'gulp';
import * as ts from 'gulp-typescript';
import {ClassGen} from "../../../core/ClassGen";
import {Question} from "inquirer";
import {NGDependencyInjector} from "./NGDependencyInjector";
import {MethodGen} from "../../../core/MethodGen";
import {Placeholder} from "../../../core/Placeholder";
import {Model} from "../../../../cmn/Model";
import {Schema} from "../../../../cmn/Schema";
import {Field} from "../../../../cmn/Field";
import {Util} from "../../../../util/Util";
import {XMLGen} from "../../../core/XMLGen";
import {Vesta} from "../../../file/Vesta";
import {BaseFormGen} from "./form/BaseFormGen";
import {MaterialFormGen} from "./form/MaterialFormGen";
import {ModelGen} from "../../ModelGen";
import {EmptyFormGen} from "./form/EmptyFormGen";
import {ClientAppGen} from "../../../app/client/ClientAppGen";
import {IProjectGenConfig} from "../../../ProjectGen";
import {IonicFormGen} from "./form/IonicFormGen";

export interface INGFormConfig {
    name: string;
    model: string;
    module: string;
    writeToFile?: boolean;
}

export interface INGFormWrapperConfig {
    type: string;
    isModal: boolean;
    formPath: string;
    title: string;
    ok: string;
    cancel: string;
}

export class NGFormGen {

    static Type = {Add: 'add', Edit: 'edit'};

    vesta:Vesta;
    model:Model;
    schema:Schema;
    form:BaseFormGen;
    path:string = 'src/app/templates';

    constructor(private config:INGFormConfig) {
        this.vesta = Vesta.getInstance();
        this.model = ModelGen.getModel(config.model);
        if (this.model) {
            this.schema = this.model['schema'];
            var projectConfig = this.vesta.getConfig();
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
            Util.log.error(`Model file was not found. You have to run gulp task first.`);
            this.form = new EmptyFormGen(null);
        }
        try {
            fs.mkdirpSync(this.path);
        } catch (e) {
        }
    }

    generate() {
        if (!this.model) return;
        var code = this.form.generate();
        if (this.config.writeToFile) Util.fs.writeFile(path.join(this.path, 'form.html'), code);
        return code;
    }

    wrap(config:INGFormWrapperConfig):XMLGen {
        return this.form.wrap(config);
    }

    static getGeneratorConfig(callback) {
        var models = Object.keys(ModelGen.getModelsList()),
            config:INGFormConfig = <INGFormConfig>{};
        config.module = '';

        var qs:Array<Question> = [
            {name: 'module', type: 'input', message: 'Module Name: '}
        ];
        if (models.length) {
            qs.push({name: 'model', type: 'list', message: 'Model: ', choices: models, default: models[0]});
        } else {
            return Util.log.error('There is no model to generate form upon');
        }
        inquirer.prompt(qs, answer => {
            if (answer['module']) {
                config.module = answer['module'];
            }
            config.model = answer['model'];
            callback(config);
        })
    }
}
