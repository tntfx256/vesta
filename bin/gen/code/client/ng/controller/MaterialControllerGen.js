"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require('lodash');
var Util_1 = require("../../../../../util/Util");
var ModelGen_1 = require("../../../ModelGen");
var BaseNGControllerGen_1 = require("./BaseNGControllerGen");
var ClassGen_1 = require("../../../../core/ClassGen");
var MaterialListGen_1 = require("./../list/MaterialListGen");
var TSFileGen_1 = require("../../../../core/TSFileGen");
var MaterialControllerGen = (function (_super) {
    __extends(MaterialControllerGen, _super);
    function MaterialControllerGen() {
        _super.apply(this, arguments);
    }
    MaterialControllerGen.prototype.setModelRequiredInjections = function () {
        _super.prototype.setModelRequiredInjections.call(this);
        // todo Only if the form is displayed in modal -> this should be injected
        this.addInjection({
            name: '$mdDialog',
            type: 'IDialogService',
            path: 'angular.material.IDialogService',
            isLib: true,
            importType: TSFileGen_1.TsFileGen.ImportType.Namespace
        });
    };
    MaterialControllerGen.prototype.setAsListController = function () {
        var ctrlName = _.camelCase(this.config.name), capitalize = _.capitalize(ctrlName), modelInstanceName = _.camelCase(this.config.model), modelPlural = Util_1.Util.plural(_.camelCase(this.config.model)), model = ModelGen_1.ModelGen.getModel(this.config.model), url = (this.config.module ? (this.config.module + '/') : '') + ctrlName + '/', firstField = Object.keys(model['schema'].getFields())[0], edge = Util_1.Util.joinPath(this.config.module, ctrlName), modelListName = modelPlural + "List", modelSelectedListName = "selected" + _.capitalize(modelPlural) + "List";
        this.controllerFile.addImport("{IQueryRequest, IQueryResult, IDeleteResult}", Util_1.Util.genRelativePath(this.path, 'src/app/cmn/ICRUDResult'));
        this.controllerFile.addImport("{ExtArray}", Util_1.Util.genRelativePath(this.path, 'src/app/cmn/collection/ExtArray'));
        this.controllerClass.addProperty({
            name: modelListName,
            type: "ExtArray<I" + this.config.model + ">",
            access: ClassGen_1.ClassGen.Access.Private,
            defaultValue: "new ExtArray<I" + this.config.model + ">()"
        });
        this.controllerClass.addProperty({
            name: modelSelectedListName,
            type: "ExtArray<I" + this.config.model + ">",
            access: ClassGen_1.ClassGen.Access.Private,
            defaultValue: "new ExtArray<I" + this.config.model + ">()"
        });
        this.controllerClass.addProperty({ name: 'dtOption', type: "any", access: ClassGen_1.ClassGen.Access.Private });
        this.controllerClass.addProperty({
            name: 'currentPage',
            type: "number",
            access: ClassGen_1.ClassGen.Access.Private,
            defaultValue: '1'
        });
        this.controllerClass.addProperty({
            name: 'busy',
            type: "boolean",
            access: ClassGen_1.ClassGen.Access.Private,
            defaultValue: 'false'
        });
        this.controllerClass.getConstructor().appendContent("this.dtOption = {\n            showFilter: false,\n            title: 'List of " + modelPlural + "',\n            filter: '',\n            order: '" + firstField + "',\n            rowsPerPage: [10, 20, 50],\n            limit: 10,\n            page: 1,\n            total: 0,\n            label: {text: 'Records', of: 'of'},\n            loadMore: this.loadMore.bind(this)\n        };\n        apiService.get<IQueryRequest<I" + this.config.model + ">, IQueryResult<I" + this.config.model + ">>('" + ctrlName + "', {limit: 50})\n            .then(result=> {\n                if (result.error) return this.notificationService.toast(result.error.message);\n                this." + modelListName + ".set(result.items);\n                this.dtOption.total = result.total;\n            })");
        this.controllerFile.addImport('IDialogOptions', 'angular.material.IDialogOptions', TSFileGen_1.TsFileGen.ImportType.Namespace);
        // loadMore
        var loadMoreMethod = this.controllerClass.addMethod('loadMore');
        loadMoreMethod.addParameter({ name: 'page', type: 'number' });
        loadMoreMethod.setContent("if(this.busy || page <= this.currentPage) return;\n        this.busy = true;\n        this.apiService.get<IQueryRequest<I" + this.config.model + ">, IQueryResult<I" + this.config.model + ">>('" + ctrlName + "', {\n                limit: 10,\n                pageNumber: ++this.currentPage\n            })\n            .then(result=> {\n                if (result.error) return this.notificationService.toast(result.error.message);\n                for(var i=0;i < result.items.length;i++){\n                    this." + modelListName + ".push(result.items[i]);\n                }\n                this.dtOption.total = result.total;\n                this.busy = false;\n            })");
        // add method
        var addMethod = this.controllerClass.addMethod("add" + this.config.model);
        addMethod.addParameter({ name: 'event', type: 'MouseEvent' });
        addMethod.setContent("this.$mdDialog.show(<IDialogOptions>{\n            controller: '" + ctrlName + "AddController',\n            controllerAs: 'vm',\n            templateUrl: 'tpl/" + url + ctrlName + "AddForm.html',\n            parent: angular.element(document.body),\n            targetEvent: event\n        })\n        .then((" + modelInstanceName + ") => {\n            this." + modelPlural + "List.push(" + modelInstanceName + ");\n            this.notificationService.toast('New " + modelInstanceName + " has been added successfully');\n        })");
        // edit method
        var editMethod = this.controllerClass.addMethod("edit" + this.config.model);
        editMethod.addParameter({ name: 'event', type: 'MouseEvent' });
        editMethod.addParameter({ name: 'id', type: 'number' });
        editMethod.setContent("this.$mdDialog.show(<IDialogOptions>{\n            controller: '" + ctrlName + "EditController',\n            controllerAs: 'vm',\n            templateUrl: 'tpl/" + url + ctrlName + "EditForm.html',\n            parent: angular.element(document.body),\n            targetEvent: event,\n            locals: {\n                id: id\n            }\n        })\n        .then((" + modelInstanceName + ": I" + this.config.model + ") => {\n            this." + modelListName + "[this." + modelListName + ".indexOfByProperty('id', " + modelInstanceName + ".id)] = " + modelInstanceName + ";\n            this.notificationService.toast('" + modelInstanceName + " has been updated successfully');\n        })");
        // delete method
        var delMethod = this.controllerClass.addMethod("del" + this.config.model);
        delMethod.addParameter({ name: 'event', type: 'MouseEvent' });
        delMethod.setContent("var confirm = this.$mdDialog.confirm()\n            .parent(angular.element(document.body))\n            .title('Delete confirmation')\n            .textContent('Are you sure about deleting the select " + modelInstanceName + "')\n            .targetEvent(event)\n            .ok('Yes').cancel('No');\n        this.$mdDialog.show(confirm).then(() => {\n            var " + modelInstanceName + "Ids = [];\n            this." + modelSelectedListName + ".forEach(" + modelInstanceName + " => {\n                " + modelInstanceName + "Ids.push(" + modelInstanceName + ".id);\n            });\n            this.apiService.delete<any, IDeleteResult>('" + edge + "', " + modelInstanceName + "Ids)\n                .then(result=> {\n                    if (result.error) return this.notificationService.toast(result.error.message);\n                    this." + modelListName + ".removeByProperty('id', result.items);\n                    this." + modelSelectedListName + ".clear();\n                    this.notificationService.toast(result.items.length + ' " + modelInstanceName + " has been deleted successfully');\n                })\n        })");
        // template
        var template = new MaterialListGen_1.MaterialListGen(this.config);
        template.generate();
    };
    MaterialControllerGen.prototype.setAsAddController = function () {
        this.isSpecialController = true;
        var ctrlName = _.camelCase(this.config.name), modelName = this.config.model, modelInstanceName = _.camelCase(modelName), formName = modelInstanceName + "Form", edge = Util_1.Util.joinPath(this.config.module, ctrlName);
        this.controllerFile.name = _.capitalize(ctrlName) + 'AddController';
        this.controllerClass.name = this.controllerFile.name;
        this.controllerClass.addProperty({ name: formName, type: 'IFormController', access: ClassGen_1.ClassGen.Access.Private });
        this.controllerFile.addImport("{IUpsertResult}", Util_1.Util.genRelativePath(this.path, 'src/app/cmn/ICRUDResult'));
        this.controllerFile.addImport('{IFormController}', 'angular');
        this.controllerClass.getConstructor().appendContent("this." + modelInstanceName + " = new " + modelName + "();");
        var closeMethod = this.controllerClass.addMethod('closeFormModal');
        closeMethod.setContent('this.$mdDialog.cancel();');
        var addMethod = this.controllerClass.addMethod("add" + modelName);
        addMethod.setContent("var validate = this.formService.evaluate(this." + modelInstanceName + ".validate(), this." + formName + ");\n        if (!validate) return;\n        var " + modelInstanceName + " = this." + modelInstanceName + ".getValues<I" + modelName + ">();\n        this.apiService.post<I" + modelName + ", IUpsertResult<I" + modelName + ">>('" + edge + "', " + modelInstanceName + ")\n            .then(result=> {\n                if (result.error) {\n                    if (result.error.code == Err.Code.Validation) {\n                        this.formService.evaluate(result.error['violations'], this." + formName + ");\n                    }\n                    return this.notificationService.toast(result.error.message);\n                }\n                this.$mdDialog.hide(result.items[0]);\n            })\n            .catch(reason=> {\n                this.$mdDialog.cancel(reason);\n            });");
    };
    MaterialControllerGen.prototype.setAsEditController = function () {
        this.addInjection({ name: 'locals', type: 'any', path: '', isLib: true });
        this.isSpecialController = true;
        var ctrlName = _.camelCase(this.config.name), modelName = this.config.model, modelInstanceName = _.camelCase(modelName), formName = modelInstanceName + "Form", edge = Util_1.Util.joinPath(this.config.module, ctrlName);
        this.controllerFile.name = _.capitalize(ctrlName) + 'EditController';
        this.controllerClass.name = this.controllerFile.name;
        this.controllerClass.addProperty({ name: formName, type: 'IFormController', access: ClassGen_1.ClassGen.Access.Private });
        this.controllerFile.addImport("{IQueryResult, IUpsertResult}", Util_1.Util.genRelativePath(this.path, 'src/app/cmn/ICRUDResult'));
        this.controllerFile.addImport('{IFormController}', 'angular');
        this.controllerClass.getConstructor().appendContent("apiService.get<I" + modelName + ", IQueryResult<I" + modelName + ">>('" + edge + "/'+this.locals.id)\n            .then(result=> {\n                if (result.error) return $mdDialog.cancel(result.error);\n                this." + modelInstanceName + " = new " + modelName + "(result.items[0]);\n            })\n            .catch(reason=>$mdDialog.cancel(reason));\n        ");
        var closeMethod = this.controllerClass.addMethod('closeFormModal');
        closeMethod.setContent('this.$mdDialog.cancel();');
        var updateMethod = this.controllerClass.addMethod("edit" + modelName);
        updateMethod.setContent("if (this." + formName + ".$dirty == false) {\n            this.$mdDialog.cancel();\n            return;\n        }\n        var validate = this.formService.evaluate(this." + modelInstanceName + ".validate(), this." + formName + ");\n        if (!validate) return;\n        var " + modelInstanceName + " = this." + modelInstanceName + ".getValues<I" + modelName + ">();\n        this.apiService.put<I" + modelName + ", IUpsertResult<I" + modelName + ">>('" + edge + "', " + modelInstanceName + ")\n            .then(result=> {\n                if (result.error) {\n                    if (result.error.code == Err.Code.Validation) {\n                        this.formService.evaluate(result.error['violations'], this." + formName + ");\n                    }\n                    return this.notificationService.toast(result.error.message);\n                }\n                this.$mdDialog.hide(result.items[0]);\n            })\n            .catch(reason=> {\n                this.$mdDialog.cancel(reason);\n            });");
    };
    return MaterialControllerGen;
}(BaseNGControllerGen_1.BaseNGControllerGen));
exports.MaterialControllerGen = MaterialControllerGen;
