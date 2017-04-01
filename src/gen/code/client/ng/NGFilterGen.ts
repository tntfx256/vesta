import * as fs from "fs-extra";
import * as _ from "lodash";
import {NGDependencyInjector} from "./NGDependencyInjector";
import {MethodGen} from "../../../core/MethodGen";
import {Placeholder} from "../../../core/Placeholder";
import {TsFileGen} from "../../../core/TSFileGen";
import {FsUtil} from "../../../../util/FsUtil";

export interface IFilterGenConfig {
    name: string;
}

export class NGFilterGen {

    private path = 'src/app/filter';
    private file: TsFileGen;
    private method: MethodGen;

    constructor(config: IFilterGenConfig) {
        if (/.+filter$/i.exec(config.name)) {
            config.name = config.name.replace(/filter$/i, '');
        }
        let rawName = _.camelCase(config.name);
        this.file = new TsFileGen(rawName + 'Filter');
        this.method = this.file.addMethod(this.file.name);
        this.method.shouldExport(true);
        this.method.setContent(`return (input: string, ...args: Array<string>):string => {
            return input;
        }`);
        this.file.addMixin(`${this.file.name}.$inject = [];`, TsFileGen.CodeLocation.AfterMethod);
        FsUtil.mkdir(this.path);
    }

    generate() {
        let tplPath = 'src/templates/filter';
        try {
            fs.mkdirSync(tplPath);
        } catch (e) {
        }
        NGDependencyInjector.updateImportFile(this.file, 'filter', this.path, Placeholder.NGFilter, '../filter');
    }

    static getGeneratorConfig(cb: (config: IFilterGenConfig) => void) {
        cb(<IFilterGenConfig>{});
    }
}
