import * as fs from "fs-extra";
import * as _ from "lodash";
import {ClassGen} from "../../../core/ClassGen";
import {NGDependencyInjector, INGInjectable} from "./NGDependencyInjector";
import {Placeholder} from "../../../core/Placeholder";
import {TsFileGen} from "../../../core/TSFileGen";
import {StringUtil} from "../../../../util/StringUtil";

export interface INGServcieConfig {
    name: string;
    injects: Array<INGInjectable>;
}

export class NGServiceGen {

    private path = 'src/app/service';
    private serviceClass: ClassGen;
    private serviceFile: TsFileGen;

    constructor(private config: INGServcieConfig) {
        if (/.+service$/i.exec(config.name)) {
            config.name = config.name.replace(/service$/i, '');
        }
        let rawName = _.camelCase(config.name) + 'Service';
        this.serviceFile = new TsFileGen(StringUtil.fcUpper(rawName));
        this.serviceClass = this.serviceFile.addClass();
        this.serviceClass.setConstructor();
        try {
            fs.mkdirpSync(this.path);
        } catch (e) {
        }
    }

    generate() {
        NGDependencyInjector.inject(this.serviceFile, this.config.injects, this.path);
        NGDependencyInjector.updateImportFile(this.serviceFile, 'service', this.path, Placeholder.NGService, '../service');
    }

    static getGeneratorConfig(callback) {
        let config: INGServcieConfig = <INGServcieConfig>{};
        NGDependencyInjector.getCliInjectables()
            .then(injectables => {
                config.injects = injectables;
                callback(config);
            });
    }
}
