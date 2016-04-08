import * as fs from 'fs-extra';
import * as path from 'path';
import * as _ from 'lodash';
import * as colors from 'colors';
import * as inquirer from 'inquirer';
import {ClassGen} from "../../../core/ClassGen";
import {Question} from "inquirer";
import {NGDependencyInjector, INGInjectable} from "./NGDependencyInjector";
import {MethodGen} from "../../../core/MethodGen";
import {Placeholder} from "../../../core/Placeholder";
import {TsFileGen} from "../../../core/TSFileGen";

export interface INGServcieConfig {
    name: string;
    injects: Array<INGInjectable>;
}

export class NGServiceGen {

    private path = 'src/app/service';
    private serviceClass:ClassGen;
    private serviceFile:TsFileGen;

    constructor(private config:INGServcieConfig) {
        if (/.+service$/i.exec(config.name)) {
            config.name = config.name.replace(/service$/i, '');
        }
        var rawName = _.camelCase(config.name) + 'Service';
        this.serviceFile = new TsFileGen(_.capitalize(rawName));
        this.serviceClass = this.serviceFile.addClass();
        this.serviceClass.setConstructor();
        try {
            fs.mkdirpSync(this.path);
        } catch (e) {
        }
    }

    generate() {
        NGDependencyInjector.inject(this.serviceFile, this.config.injects, this.path);
        NGDependencyInjector.updateImportAndAppFile(this.serviceFile, 'service', this.path, Placeholder.NGService, '../service');
    }

    static getGeneratorConfig(callback) {
        var config:INGServcieConfig = <INGServcieConfig>{};
        NGDependencyInjector.getCliInjectables()
            .then(injectables => {
                config.injects = injectables;
                callback(config);
            });
    }
}
