import * as fs from "fs-extra";
import * as path from "path";
import * as _ from "lodash";
import {INGControllerConfig, NGControllerGen} from "../NGControllerGen";
import {TsFileGen} from "../../../../core/TSFileGen";
import {ClassGen} from "../../../../core/ClassGen";
import {NGFormGen, INGFormWrapperConfig} from "../NGFormGen";
import {INGInjectable, NGDependencyInjector} from "../NGDependencyInjector";
import {Util} from "../../../../../util/Util";
import {Placeholder} from "../../../../core/Placeholder";
import {XMLGen} from "../../../../core/XMLGen";
import {SassGen} from "../../../../file/SassGen";
import {FsUtil} from "../../../../../util/FsUtil";

export abstract class BaseNGControllerGen {
    protected controllerFile:TsFileGen;
    protected controllerClass:ClassGen;
    protected path:string = 'src/app/modules';
    protected templatePath:string = 'src/app/templates';
    protected form:NGFormGen;
    protected hasScope:boolean = false;
    protected isSpecialController:boolean = false;

    constructor(protected config:INGControllerConfig) {
        if (/.+controller$/i.exec(config.name)) {
            config.name = config.name.replace(/controller$/i, '');
        }
        var ctrlName = _.camelCase(config.name);
        var ctrlClassName = `${ctrlName}Controller`;
        this.controllerFile = new TsFileGen(_.capitalize(ctrlClassName));
        this.controllerClass = this.controllerFile.addClass();
        this.controllerClass.setConstructor();
        this.path = path.join(this.path, config.module);
        this.templatePath = path.join(this.templatePath, config.module);
        if (config.model) {
            this.form = new NGFormGen(config);
            this.path = path.join(this.path, ctrlName);
            this.templatePath = path.join(this.templatePath, ctrlName);
            this.setModelRequiredInjections();
        }
        FsUtil.mkdir(this.path, this.templatePath);
        for (var i = config.injects.length; i--;) {
            if (config.injects[i].name == '$scope') {
                config.injects.splice(i, 1);
                this.hasScope = true;
                break;
            }
        }
    }

    protected addInjection(inject:INGInjectable) {
        for (var i = this.config.injects.length; i--;) {
            if (this.config.injects[i].name == inject.name) return;
        }
        this.config.injects.push(inject);
    }

    protected setModelRequiredInjections() {
        // importing model
        this.controllerClass.addProperty({
            name: _.camelCase(this.config.model),
            type: this.config.model,
            access: ClassGen.Access.Private
        });
        this.controllerFile.addImport(`{I${this.config.model}, ${this.config.model}}`, Util.genRelativePath(this.path, `src/app/cmn/models/${this.config.model}`));
        // importing Err
        this.controllerFile.addImport('{Err}', Util.genRelativePath(this.path, 'src/app/cmn/Err'));
        // importing apiService
        this.addInjection({name: 'apiService', type: 'ApiService', path: 'src/app/service/ApiService'});
        // importing formService
        this.addInjection({name: 'formService', type: 'FormService', path: 'src/app/service/FormService'});
        //importing notificationService
        this.addInjection({
            name: 'notificationService', type: 'NotificationService', path: 'src/app/service/NotificationService'
        });
    }

    protected generateRoute() {
        var ctrlName = _.camelCase(this.config.name),
            pathParts = [];
        if (this.config.module) {
            pathParts.push(this.config.module);
        }
        pathParts.push(ctrlName);
        var url = ctrlName,
            state = pathParts.join('.'),
            templateUrl = '';
        if (this.isSpecialController) {
            url = pathParts.join('/');
            templateUrl = `tpl/${url}/${ctrlName}List.html`;
        } else {
            templateUrl = `tpl/${ctrlName}.html`;
        }
        var codeFirstLine = `$stateProvider.state('${state}', {`;
        if (Util.fileHasContent('src/app/config/route.ts', codeFirstLine)) return;
        var code = `${codeFirstLine}
        url: '/${url}',
        views: {
            'master': {
                templateUrl: '${templateUrl}',
                controller: '${ctrlName}Controller',
                controllerAs: 'vm'
            }
        }
    });\n    ${Placeholder.NGRouter}`;
        var routerFile = 'src/app/config/route.ts';
        var routeCode = fs.readFileSync(routerFile, {encoding: 'utf8'});
        FsUtil.writeFile(routerFile, routeCode.replace(Placeholder.NGRouter, code));
    }

    protected generateForm() {
        var ctrlName = _.camelCase(this.config.name),
            formName = `${ctrlName}Form`,
            includePath = Util.joinPath('tpl', this.config.module, ctrlName),
            config:INGFormWrapperConfig = <INGFormWrapperConfig>{};
        config.formPath = Util.joinPath(includePath, `${formName}.html`);
        FsUtil.writeFile(path.join(this.templatePath, `${ctrlName}Form.html`), this.form.generate());
        config.isModal = true;
        config.type = NGFormGen.Type.Add;
        config.title = `Add ${this.config.model}`;
        config.cancel = 'Cancel';
        config.ok = 'Save';
        var addForm = this.form.wrap(config);
        FsUtil.writeFile(path.join(this.templatePath, `${ctrlName}AddForm.html`), addForm.generate());
        config.type = NGFormGen.Type.Edit;
        config.title = `Edit ${this.config.model}`;
        var editForm = this.form.wrap(config);
        FsUtil.writeFile(path.join(this.templatePath, `${ctrlName}EditForm.html`), editForm.generate());
        //
        var addController = new NGControllerGen(this.config);
        addController.setAsAddController();
        addController.generate();
        //
        var editController = new NGControllerGen(this.config);
        editController.setAsEditController();
        editController.generate();
    }

    public abstract setAsListController();

    public abstract setAsAddController();

    public abstract setAsEditController();

    protected createEmptyTemplate() {
        var template = new XMLGen('div'),
            pageName = _.camelCase(this.config.name);
        template.setAttribute('id', `${pageName}-page`);
        pageName = _.capitalize(_.camelCase(this.config.name));
        template.html(`<h1>${pageName} Page</h1>`);
        var sass = new SassGen(this.config.name, SassGen.Type.Page);
        sass.generate();
        FsUtil.writeFile(path.join(this.templatePath, _.camelCase(this.config.name) + '.html'), template.generate());
    }

    protected createScope() {
        var name = _.capitalize(_.camelCase(this.config.name));
        var scopeInterface = this.controllerFile.addInterface(`I${name}Scope`);
        scopeInterface.setParentClass('IScope');
        this.controllerFile.addImport('{IScope}', 'angular');
        this.addInjection({name: '$scope', type: scopeInterface.name, path: '', isLib: true});
    }

    public generate() {
        if (this.hasScope) {
            this.createScope();
        }
        NGDependencyInjector.inject(this.controllerFile, this.config.injects, this.path, this.isSpecialController);
        if (this.config.model && !this.isSpecialController) {
            this.generateForm();
            this.setAsListController();
        } else {
            this.createEmptyTemplate();
        }
        this.generateRoute();
        NGDependencyInjector.updateImportAndAppFile(this.controllerFile, 'controller', this.path, Placeholder.NGController, Util.genRelativePath('src/app/config', this.path));
    }
}