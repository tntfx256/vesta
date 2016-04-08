"use strict";
var fs = require('fs-extra');
var path = require('path');
var _ = require('lodash');
var inquirer = require('inquirer');
var ClassGen_1 = require("../../../core/ClassGen");
var TSFileGen_1 = require("../../../core/TSFileGen");
var NGDependencyInjector_1 = require("./NGDependencyInjector");
var Placeholder_1 = require("../../../core/Placeholder");
var Util_1 = require("../../../../util/Util");
var SassGen_1 = require("../../../file/SassGen");
var NGDirectiveGen = (function () {
    function NGDirectiveGen(config) {
        this.config = config;
        this.path = 'src/app/directive';
        this.rawName = _.camelCase(config.name);
        this.tplFileName = _.kebabCase(this.rawName);
        this.file = new TSFileGen_1.TsFileGen(this.rawName);
        this.sassFile = new SassGen_1.SassGen(this.tplFileName, SassGen_1.SassGen.Type.Directive);
        this.file.addImport('{IScope, IDirective, IAugmentedJQuery, IAttributes}', 'angular');
        this.createInterface();
        this.createClass();
        this.createMethod();
        //
        try {
            fs.mkdirSync(this.path);
        }
        catch (e) {
        }
    }
    NGDirectiveGen.prototype.createInterface = function () {
        var name = _.capitalize(this.file.name);
        this.scopeInterface = this.file.addInterface("I" + name + "Scope");
        this.scopeInterface.setParentClass('IScope');
    };
    NGDirectiveGen.prototype.createClass = function () {
        this.controllerClass = this.file.addClass(_.capitalize(this.file.name) + 'Controller');
        this.controllerClass.addProperty({
            name: '$inject',
            access: ClassGen_1.ClassGen.Access.Public,
            isStatic: true,
            defaultValue: "['$scope', '$element']"
        });
        var cm = this.controllerClass.setConstructor();
        cm.addParameter({ name: '$scope', type: this.scopeInterface.name, access: ClassGen_1.ClassGen.Access.Private });
        cm.addParameter({ name: '$element', type: 'IAugmentedJQuery', access: ClassGen_1.ClassGen.Access.Private });
        for (var i = 0, il = this.config.injects.length; i < il; ++i) {
            var inj = this.config.injects[i];
            this.file.addImport("{" + inj.name + "}", Util_1.Util.genRelativePath(this.path, inj.path));
            cm.addParameter({ name: inj.name, type: inj.type, access: ClassGen_1.ClassGen.Access.Private });
        }
        this.file.addMixin("/**\n * @ngdoc directive\n * @name " + this.rawName + "\n * @restrict E\n *\n */", TSFileGen_1.TsFileGen.CodeLocation.AfterClass);
    };
    NGDirectiveGen.prototype.createMethod = function () {
        this.directiveMethod = this.file.addMethod(this.rawName);
        this.directiveMethod.isSimple();
        this.directiveMethod.shouldExport();
        this.directiveMethod.setReturnType('IDirective');
        this.directiveMethod.setContent("return {\n        restrict: 'E',\n        replace: true,\n        %TEMPLATE%\n        controller: " + this.controllerClass.name + ",\n        controllerAs: 'vm',\n        bindToController: true,\n        scope: {},\n        link: function(scope:" + this.scopeInterface.name + ", $element: IAugmentedJQuery, attrs: IAttributes){\n        }\n    }");
    };
    NGDirectiveGen.prototype.generate = function () {
        var tplPath = 'src/app/templates/directive';
        try {
            fs.mkdirpSync(tplPath);
        }
        catch (e) {
            Util_1.Util.log.error(e.message);
        }
        var templateCode = "<div class=\"" + this.tplFileName + "\"></div>";
        if (this.config.externalTemplate) {
            this.directiveMethod.setContent(this.directiveMethod.getContent().replace('%TEMPLATE%', "templateUrl: 'tpl/directive/" + this.tplFileName + ".html',"));
            Util_1.Util.fs.writeFile(path.join(tplPath, this.tplFileName + '.html'), templateCode);
        }
        else {
            this.directiveMethod.setContent(this.directiveMethod.getContent().replace('%TEMPLATE%', "template: '" + templateCode + "',"));
        }
        NGDependencyInjector_1.NGDependencyInjector.updateImportAndAppFile(this.file, 'directive', this.path, Placeholder_1.Placeholder.NGDirective, '../directive');
        if (this.config.generateSass) {
            this.sassFile.generate();
        }
    };
    NGDirectiveGen.getGeneratorConfig = function (callback) {
        var config = {};
        inquirer.prompt([{
                name: 'externalTemplate',
                type: 'confirm',
                message: 'Use external template file: ',
                default: true
            }, {
                name: 'generateSass',
                type: 'confirm',
                message: 'Create Sass style file: ',
                default: true
            }], function (answer) {
            config.externalTemplate = answer['externalTemplate'];
            config.generateSass = answer['generateSass'];
            NGDependencyInjector_1.NGDependencyInjector.getCliInjectables()
                .then(function (injectables) {
                config.injects = injectables;
                callback(config);
            });
        });
    };
    return NGDirectiveGen;
}());
exports.NGDirectiveGen = NGDirectiveGen;
