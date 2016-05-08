import * as fs from "fs-extra";
import * as path from "path";
import * as _ from "lodash";
import * as inquirer from "inquirer";
import {Question} from "inquirer";
import {ClassGen} from "../../../core/ClassGen";
import {TsFileGen} from "../../../core/TSFileGen";
import {NGDependencyInjector, INGInjectable} from "./NGDependencyInjector";
import {MethodGen} from "../../../core/MethodGen";
import {Placeholder} from "../../../core/Placeholder";
import {Util} from "../../../../util/Util";
import {InterfaceGen} from "../../../core/InterfaceGen";
import {SassGen} from "../../../file/SassGen";
import {FsUtil} from "../../../../util/FsUtil";
import {Log} from "../../../../util/Log";

export interface INGDirectiveConfig {
    name:string;
    injects:Array<INGInjectable>;
    externalTemplate:boolean;
    generateSass:boolean;
}

export class NGDirectiveGen {
    private path = 'src/app/directive';
    private rawName:string;
    private file:TsFileGen;
    private controllerClass:ClassGen;
    private directiveMethod:MethodGen;
    private scopeInterface:InterfaceGen;
    private sassFile:SassGen;
    private tplFileName:string;

    constructor(private config:INGDirectiveConfig) {
        this.rawName = _.camelCase(config.name);
        this.tplFileName = _.kebabCase(this.rawName);
        this.file = new TsFileGen(this.rawName);
        this.sassFile = new SassGen(this.tplFileName, SassGen.Type.Directive);
        this.file.addImport('{IScope, IDirective, IAugmentedJQuery, IAttributes}', 'angular');
        this.createInterface();
        this.createClass();
        this.createMethod();
        //
        try {
            fs.mkdirSync(this.path);
        } catch (e) {
        }
    }

    private createInterface() {
        var name = _.capitalize(this.file.name);
        this.scopeInterface = this.file.addInterface(`I${name}Scope`);
        this.scopeInterface.setParentClass('IScope');
    }

    private createClass() {
        this.controllerClass = this.file.addClass(_.capitalize(this.file.name) + 'Controller');
        this.controllerClass.addProperty({
            name: '$inject',
            access: ClassGen.Access.Public,
            isStatic: true,
            defaultValue: "['$scope', '$element']"
        });
        var cm = this.controllerClass.setConstructor();
        cm.addParameter({name: '$scope', type: this.scopeInterface.name, access: ClassGen.Access.Private});
        cm.addParameter({name: '$element', type: 'IAugmentedJQuery', access: ClassGen.Access.Private});
        for (var i = 0, il = this.config.injects.length; i < il; ++i) {
            var inj = this.config.injects[i];
            this.file.addImport(`{${inj.name}}`, Util.genRelativePath(this.path, inj.path));
            cm.addParameter({name: inj.name, type: inj.type, access: ClassGen.Access.Private});
        }
        this.file.addMixin(`/**
 * @ngdoc directive
 * @name ${this.rawName}
 * @restrict E
 *
 */`, TsFileGen.CodeLocation.AfterClass);
    }

    private createMethod() {
        this.directiveMethod = this.file.addMethod(this.rawName);
        this.directiveMethod.isSimple();
        this.directiveMethod.shouldExport();
        this.directiveMethod.setReturnType('IDirective');
        this.directiveMethod.setContent(`return {
        restrict: 'E',
        replace: true,
        %TEMPLATE%
        controller: ${this.controllerClass.name},
        controllerAs: 'ctrl',
        bindToController: true,
        scope: {},
        link: function(scope:${this.scopeInterface.name}, $element: IAugmentedJQuery, attrs: IAttributes){
        }
    }`);
    }

    public generate() {
        var tplPath = 'src/app/templates/directive';
        try {
            fs.mkdirpSync(tplPath);
        } catch (e) {
            Log.error(e.message);
        }
        var templateCode = `<div class="${this.tplFileName}"></div>`;
        if (this.config.externalTemplate) {
            this.directiveMethod.setContent(this.directiveMethod.getContent().replace('%TEMPLATE%', `templateUrl: 'tpl/directive/${this.tplFileName}.html',`));
            FsUtil.writeFile(path.join(tplPath, this.tplFileName + '.html'), templateCode);
        } else {
            this.directiveMethod.setContent(this.directiveMethod.getContent().replace('%TEMPLATE%', `template: '${templateCode}',`));
        }
        NGDependencyInjector.updateImportAndAppFile(this.file, 'directive', this.path, Placeholder.NGDirective, '../directive');
        if (this.config.generateSass) {
            this.sassFile.generate();
        }
    }

    public static getGeneratorConfig(callback) {
        var config:INGDirectiveConfig = <INGDirectiveConfig>{};
        inquirer.prompt([<Question>{
            name: 'externalTemplate',
            type: 'confirm',
            message: 'Use external template file: ',
            default: true
        }, <Question>{
            name: 'generateSass',
            type: 'confirm',
            message: 'Create Sass style file: ',
            default: true
        }], answer=> {
            config.externalTemplate = answer['externalTemplate'];
            config.generateSass = answer['generateSass'];
            NGDependencyInjector.getCliInjectables()
                .then(injectables => {
                    config.injects = injectables;
                    callback(config);
                });
        });
    }
}