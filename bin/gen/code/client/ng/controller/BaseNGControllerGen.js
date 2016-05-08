"use strict";
var fs = require("fs-extra");
var path = require("path");
var _ = require("lodash");
var NGControllerGen_1 = require("../NGControllerGen");
var TSFileGen_1 = require("../../../../core/TSFileGen");
var ClassGen_1 = require("../../../../core/ClassGen");
var NGFormGen_1 = require("../NGFormGen");
var NGDependencyInjector_1 = require("../NGDependencyInjector");
var Util_1 = require("../../../../../util/Util");
var Placeholder_1 = require("../../../../core/Placeholder");
var XMLGen_1 = require("../../../../core/XMLGen");
var SassGen_1 = require("../../../../file/SassGen");
var FsUtil_1 = require("../../../../../util/FsUtil");
var BaseNGControllerGen = (function () {
    function BaseNGControllerGen(config) {
        this.config = config;
        this.path = 'src/app/modules';
        this.templatePath = 'src/app/templates';
        this.hasScope = false;
        this.isSpecialController = false;
        if (/.+controller$/i.exec(config.name)) {
            config.name = config.name.replace(/controller$/i, '');
        }
        var ctrlName = _.camelCase(config.name);
        var ctrlClassName = ctrlName + "Controller";
        this.controllerFile = new TSFileGen_1.TsFileGen(_.capitalize(ctrlClassName));
        this.controllerClass = this.controllerFile.addClass();
        this.controllerClass.setConstructor();
        this.path = path.join(this.path, config.module);
        this.templatePath = path.join(this.templatePath, config.module);
        if (config.model) {
            this.form = new NGFormGen_1.NGFormGen(config);
            this.path = path.join(this.path, ctrlName);
            this.templatePath = path.join(this.templatePath, ctrlName);
            this.setModelRequiredInjections();
        }
        FsUtil_1.FsUtil.mkdir(this.path, this.templatePath);
        for (var i = config.injects.length; i--;) {
            if (config.injects[i].name == '$scope') {
                config.injects.splice(i, 1);
                this.hasScope = true;
                break;
            }
        }
    }
    BaseNGControllerGen.prototype.addInjection = function (inject) {
        for (var i = this.config.injects.length; i--;) {
            if (this.config.injects[i].name == inject.name)
                return;
        }
        this.config.injects.push(inject);
    };
    BaseNGControllerGen.prototype.setModelRequiredInjections = function () {
        // importing model
        this.controllerClass.addProperty({
            name: _.camelCase(this.config.model),
            type: this.config.model,
            access: ClassGen_1.ClassGen.Access.Private
        });
        this.controllerFile.addImport("{I" + this.config.model + ", " + this.config.model + "}", Util_1.Util.genRelativePath(this.path, "src/app/cmn/models/" + this.config.model));
        // importing Err
        this.controllerFile.addImport('{Err}', Util_1.Util.genRelativePath(this.path, 'src/app/cmn/Err'));
        // importing apiService
        this.addInjection({ name: 'apiService', type: 'ApiService', path: 'src/app/service/ApiService' });
        // importing formService
        this.addInjection({ name: 'formService', type: 'FormService', path: 'src/app/service/FormService' });
        //importing notificationService
        this.addInjection({
            name: 'notificationService', type: 'NotificationService', path: 'src/app/service/NotificationService'
        });
    };
    BaseNGControllerGen.prototype.generateRoute = function () {
        var ctrlName = _.camelCase(this.config.name), pathParts = [];
        if (this.config.module) {
            pathParts.push(this.config.module);
        }
        pathParts.push(ctrlName);
        var url = ctrlName, state = pathParts.join('.'), templateUrl = '';
        if (this.isSpecialController) {
            url = pathParts.join('/');
            templateUrl = "tpl/" + url + "/" + ctrlName + "List.html";
        }
        else {
            templateUrl = "tpl/" + ctrlName + ".html";
        }
        var codeFirstLine = "$stateProvider.state('" + state + "', {";
        if (Util_1.Util.fileHasContent('src/app/config/route.ts', codeFirstLine))
            return;
        var code = codeFirstLine + "\n        url: '/" + url + "',\n        views: {\n            'master': {\n                templateUrl: '" + templateUrl + "',\n                controller: '" + ctrlName + "Controller',\n                controllerAs: 'vm'\n            }\n        }\n    });\n    " + Placeholder_1.Placeholder.NGRouter;
        var routerFile = 'src/app/config/route.ts';
        var routeCode = fs.readFileSync(routerFile, { encoding: 'utf8' });
        FsUtil_1.FsUtil.writeFile(routerFile, routeCode.replace(Placeholder_1.Placeholder.NGRouter, code));
    };
    BaseNGControllerGen.prototype.generateForm = function () {
        var ctrlName = _.camelCase(this.config.name), formName = ctrlName + "Form", includePath = Util_1.Util.joinPath('tpl', this.config.module, ctrlName), config = {};
        config.formPath = Util_1.Util.joinPath(includePath, formName + ".html");
        FsUtil_1.FsUtil.writeFile(path.join(this.templatePath, ctrlName + "Form.html"), this.form.generate());
        config.isModal = true;
        config.type = NGFormGen_1.NGFormGen.Type.Add;
        config.title = "Add " + this.config.model;
        config.cancel = 'Cancel';
        config.ok = 'Save';
        var addForm = this.form.wrap(config);
        FsUtil_1.FsUtil.writeFile(path.join(this.templatePath, ctrlName + "AddForm.html"), addForm.generate());
        config.type = NGFormGen_1.NGFormGen.Type.Edit;
        config.title = "Edit " + this.config.model;
        var editForm = this.form.wrap(config);
        FsUtil_1.FsUtil.writeFile(path.join(this.templatePath, ctrlName + "EditForm.html"), editForm.generate());
        //
        var addController = new NGControllerGen_1.NGControllerGen(this.config);
        addController.setAsAddController();
        addController.generate();
        //
        var editController = new NGControllerGen_1.NGControllerGen(this.config);
        editController.setAsEditController();
        editController.generate();
    };
    BaseNGControllerGen.prototype.createEmptyTemplate = function () {
        var template = new XMLGen_1.XMLGen('div'), pageName = _.camelCase(this.config.name);
        template.setAttribute('id', pageName + "-page");
        pageName = _.capitalize(_.camelCase(this.config.name));
        template.html("<h1>" + pageName + " Page</h1>");
        var sass = new SassGen_1.SassGen(this.config.name, SassGen_1.SassGen.Type.Page);
        sass.generate();
        FsUtil_1.FsUtil.writeFile(path.join(this.templatePath, _.camelCase(this.config.name) + '.html'), template.generate());
    };
    BaseNGControllerGen.prototype.createScope = function () {
        var name = _.capitalize(_.camelCase(this.config.name));
        var scopeInterface = this.controllerFile.addInterface("I" + name + "Scope");
        scopeInterface.setParentClass('IScope');
        this.controllerFile.addImport('{IScope}', 'angular');
        this.addInjection({ name: '$scope', type: scopeInterface.name, path: '', isLib: true });
    };
    BaseNGControllerGen.prototype.generate = function () {
        if (this.hasScope) {
            this.createScope();
        }
        NGDependencyInjector_1.NGDependencyInjector.inject(this.controllerFile, this.config.injects, this.path, this.isSpecialController);
        if (this.config.model && !this.isSpecialController) {
            this.generateForm();
            this.setAsListController();
        }
        else {
            this.createEmptyTemplate();
        }
        this.generateRoute();
        NGDependencyInjector_1.NGDependencyInjector.updateImportAndAppFile(this.controllerFile, 'controller', this.path, Placeholder_1.Placeholder.NGController, Util_1.Util.genRelativePath('src/app/config', this.path));
    };
    return BaseNGControllerGen;
}());
exports.BaseNGControllerGen = BaseNGControllerGen;
