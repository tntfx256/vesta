import * as fs from "fs-extra";
import * as path from "path";
import * as _ from "lodash";
import {XMLGen} from "../../../../core/XMLGen";
import {INGControllerConfig} from "../NGControllerGen";
import {Util} from "../../../../../util/Util";
import {ModelGen} from "../../../ModelGen";
import {FsUtil} from "../../../../../util/FsUtil";

export class MaterialListGen {
    private list: XMLGen;
    private path: string = 'src/app/templates';

    constructor(private config: INGControllerConfig) {
        let ctrlName = _.camelCase(this.config.name);
        this.list = new XMLGen('div');
        let modelName = ModelGen.extractModelName(this.config.model);
        this.list.setAttribute('layout', 'column').setAttribute('id', `${modelName}-list-page`);
        this.path = path.join(this.path, config.module, ctrlName);
        try {
            fs.mkdirpSync(this.path);
        } catch (e) {
        }
    }

    generate() {
        let ctrlName = _.camelCase(this.config.name),
            code = this.createContent();
        this.list.html(code);
        FsUtil.writeFile(path.join(this.path, `${ctrlName}List.html`), this.list.generate());
    }

    private createContent() {
        let modelName = ModelGen.extractModelName(this.config.model),
            pluralModel = Util.plural(modelName),
            pluralInstance = _.camelCase(pluralModel);
        return `    <datatable columns="vm.dtColumns" options="vm.dtOptions" records="vm.${pluralInstance}List"></datatable>`;
    }
}
