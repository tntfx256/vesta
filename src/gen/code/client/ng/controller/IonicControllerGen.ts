import * as fs from 'fs-extra';
import * as path from 'path';
import * as _ from 'lodash';
import {BaseNGControllerGen} from "./BaseNGControllerGen";
import {NGControllerGen} from "../NGControllerGen";
import {XMLGen} from "../../../../core/XMLGen";
import {SassGen} from "../../../../file/SassGen";
import {Util} from "../../../../../util/Util";

export class IonicControllerGen extends BaseNGControllerGen {

    protected createEmptyTemplate() {
        var template = new XMLGen('ion-content'),
            pageName = _.camelCase(this.config.name);
        template.setAttribute('id', `${pageName}-page`);
        pageName = _.capitalize(_.camelCase(this.config.name));
        template.html(`<h1>${pageName} Page</h1>`);
        var sass = new SassGen(this.config.name, SassGen.Type.Page);
        sass.generate();
        Util.fs.writeFile(path.join(this.templatePath, _.camelCase(this.config.name) + '.html'), template.generate());
    }

    public setAsListController() {
    }

    public setAsAddController() {
        this.isSpecialController = true;
    }

    public setAsEditController() {
        this.isSpecialController = true;
    }
}
