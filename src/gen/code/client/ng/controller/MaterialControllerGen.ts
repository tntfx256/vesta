import * as _ from "lodash";
import {Util} from "../../../../../util/Util";
import {ModelGen} from "../../../ModelGen";
import {BaseNGControllerGen} from "./BaseNGControllerGen";
import {ClassGen} from "../../../../core/ClassGen";
import {MaterialListGen} from "./../list/MaterialListGen";
import {TsFileGen} from "../../../../core/TSFileGen";

export class MaterialControllerGen extends BaseNGControllerGen {

    protected setModelRequiredInjections() {
        super.setModelRequiredInjections();
        // todo Only if the form is displayed in modal -> this should be injected
        this.addInjection({
            name: '$mdDialog',
            type: 'IDialogService',
            path: 'angular.material.IDialogService',
            isLib: true,
            importType: TsFileGen.ImportType.Namespace
        });
    }

    public setAsListController() {
        var ctrlName = _.camelCase(this.config.name),
            capitalize = _.capitalize(ctrlName),
            modelInstanceName = _.camelCase(this.config.model),
            modelPlural = Util.plural(_.camelCase(this.config.model)),
            model = ModelGen.getModel(this.config.model),
            url = (this.config.module ? (this.config.module + '/') : '') + ctrlName + '/',
            firstField = Object.keys(model['schema'].getFields())[0],
            edge = Util.joinPath(this.config.module, ctrlName),
            modelListName = `${modelPlural}List`,
            modelSelectedListName = `selected${_.capitalize(modelPlural)}List`;
        this.controllerFile.addImport(`{IQueryRequest, IQueryResult, IDeleteResult}`, Util.genRelativePath(this.path, 'src/app/cmn/ICRUDResult'));
        this.controllerFile.addImport(`{ExtArray}`, Util.genRelativePath(this.path, 'src/app/cmn/collection/ExtArray'));
        this.controllerClass.addProperty({
            name: modelListName,
            type: `ExtArray<I${this.config.model}>`,
            access: ClassGen.Access.Private,
            defaultValue: `new ExtArray<I${this.config.model}>()`
        });
        this.controllerClass.addProperty({
            name: modelSelectedListName,
            type: `ExtArray<I${this.config.model}>`,
            access: ClassGen.Access.Private,
            defaultValue: `new ExtArray<I${this.config.model}>()`
        });
        this.controllerClass.addProperty({name: 'dtOption', type: `any`, access: ClassGen.Access.Private});
        this.controllerClass.addProperty({
            name: 'currentPage',
            type: `number`,
            access: ClassGen.Access.Private,
            defaultValue: '1'
        });
        this.controllerClass.addProperty({
            name: 'busy',
            type: `boolean`,
            access: ClassGen.Access.Private,
            defaultValue: 'false'
        });
        this.controllerClass.getConstructor().appendContent(`this.dtOption = {
            showFilter: false,
            title: 'List of ${modelPlural}',
            filter: '',
            order: '${firstField}',
            rowsPerPage: [10, 20, 50],
            limit: 10,
            page: 1,
            total: 0,
            label: {text: 'Records', of: 'of'},
            loadMore: this.loadMore.bind(this)
        };
        apiService.get<IQueryRequest<I${this.config.model}>, IQueryResult<I${this.config.model}>>('${ctrlName}', {limit: 50})
            .then(result=> {
                if (result.error) return this.notificationService.toast(result.error.message);
                this.${modelListName}.set(result.items);
                this.dtOption.total = result.total;
            })`);
        this.controllerFile.addImport('IDialogOptions', 'angular.material.IDialogOptions', TsFileGen.ImportType.Namespace);
        // loadMore
        var loadMoreMethod = this.controllerClass.addMethod('loadMore');
        loadMoreMethod.addParameter({name: 'page', type: 'number'});
        loadMoreMethod.setContent(`if(this.busy || page <= this.currentPage) return;
        this.busy = true;
        this.apiService.get<IQueryRequest<I${this.config.model}>, IQueryResult<I${this.config.model}>>('${ctrlName}', {
                limit: 10,
                pageNumber: ++this.currentPage
            })
            .then(result=> {
                if (result.error) return this.notificationService.toast(result.error.message);
                for(var i=0;i < result.items.length;i++){
                    this.${modelListName}.push(result.items[i]);
                }
                this.dtOption.total = result.total;
                this.busy = false;
            })`);
        // add method
        var addMethod = this.controllerClass.addMethod(`add${this.config.model}`);
        addMethod.addParameter({name: 'event', type: 'MouseEvent'});
        addMethod.setContent(`this.$mdDialog.show(<IDialogOptions>{
            controller: '${ctrlName}AddController',
            controllerAs: 'vm',
            templateUrl: 'tpl/${url}${ctrlName}AddForm.html',
            parent: angular.element(document.body),
            targetEvent: event
        })
        .then((${modelInstanceName}) => {
            this.${modelPlural}List.push(${modelInstanceName});
            this.notificationService.toast('New ${modelInstanceName} has been added successfully');
        })`);
        // edit method
        var editMethod = this.controllerClass.addMethod(`edit${this.config.model}`);
        editMethod.addParameter({name: 'event', type: 'MouseEvent'});
        editMethod.addParameter({name: 'id', type: 'number'});
        editMethod.setContent(`this.$mdDialog.show(<IDialogOptions>{
            controller: '${ctrlName}EditController',
            controllerAs: 'vm',
            templateUrl: 'tpl/${url}${ctrlName}EditForm.html',
            parent: angular.element(document.body),
            targetEvent: event,
            locals: {
                id: id
            }
        })
        .then((${modelInstanceName}: I${this.config.model}) => {
            this.${modelListName}[this.${modelListName}.indexOfByProperty('id', ${modelInstanceName}.id)] = ${modelInstanceName};
            this.notificationService.toast('${modelInstanceName} has been updated successfully');
        })`);
        // delete method
        var delMethod = this.controllerClass.addMethod(`del${this.config.model}`);
        delMethod.addParameter({name: 'event', type: 'MouseEvent'});
        delMethod.setContent(`var confirm = this.$mdDialog.confirm()
            .parent(angular.element(document.body))
            .title('Delete confirmation')
            .textContent('Are you sure about deleting the select ${modelInstanceName}')
            .targetEvent(event)
            .ok('Yes').cancel('No');
        this.$mdDialog.show(confirm).then(() => {
            var ${modelInstanceName}Ids = [];
            this.${modelSelectedListName}.forEach(${modelInstanceName} => {
                ${modelInstanceName}Ids.push(${modelInstanceName}.id);
            });
            this.apiService.delete<any, IDeleteResult>('${edge}', ${modelInstanceName}Ids)
                .then(result=> {
                    if (result.error) return this.notificationService.toast(result.error.message);
                    this.${modelListName}.removeByProperty('id', result.items);
                    this.${modelSelectedListName}.clear();
                    this.notificationService.toast(result.items.length + ' ${modelInstanceName} has been deleted successfully');
                })
        })`);
        // template
        var template = new MaterialListGen(this.config);
        template.generate();
    }

    public setAsAddController() {
        this.isSpecialController = true;
        var ctrlName = _.camelCase(this.config.name),
            modelName = this.config.model,
            modelInstanceName = _.camelCase(modelName),
            formName = `${modelInstanceName}Form`,
            edge = Util.joinPath(this.config.module, ctrlName);
        this.controllerFile.name = _.capitalize(ctrlName) + 'AddController';
        this.controllerClass.name = this.controllerFile.name;
        this.controllerClass.addProperty({name: formName, type: 'IFormController', access: ClassGen.Access.Private});
        this.controllerFile.addImport(`{IUpsertResult}`, Util.genRelativePath(this.path, 'src/app/cmn/ICRUDResult'));
        this.controllerFile.addImport('{IFormController}', 'angular');
        this.controllerClass.getConstructor().appendContent(`this.${modelInstanceName} = new ${modelName}();`);
        var closeMethod = this.controllerClass.addMethod('closeFormModal');
        closeMethod.setContent('this.$mdDialog.cancel();');
        var addMethod = this.controllerClass.addMethod(`add${modelName}`);
        addMethod.setContent(`var validate = this.formService.evaluate(this.${modelInstanceName}.validate(), this.${formName});
        if (!validate) return;
        var ${modelInstanceName} = this.${modelInstanceName}.getValues<I${modelName}>();
        this.apiService.post<I${modelName}, IUpsertResult<I${modelName}>>('${edge}', ${modelInstanceName})
            .then(result=> {
                if (result.error) {
                    if (result.error.code == Err.Code.Validation) {
                        this.formService.evaluate(result.error['violations'], this.${formName});
                    }
                    return this.notificationService.toast(result.error.message);
                }
                this.$mdDialog.hide(result.items[0]);
            })
            .catch(reason=> {
                this.$mdDialog.cancel(reason);
            });`);
    }

    public setAsEditController() {
        this.addInjection({name: 'locals', type: 'any', path: '', isLib: true});
        this.isSpecialController = true;
        var ctrlName = _.camelCase(this.config.name),
            modelName = this.config.model,
            modelInstanceName = _.camelCase(modelName),
            formName = `${modelInstanceName}Form`,
            edge = Util.joinPath(this.config.module, ctrlName);
        this.controllerFile.name = _.capitalize(ctrlName) + 'EditController';
        this.controllerClass.name = this.controllerFile.name;
        this.controllerClass.addProperty({name: formName, type: 'IFormController', access: ClassGen.Access.Private});
        this.controllerFile.addImport(`{IQueryResult, IUpsertResult}`, Util.genRelativePath(this.path, 'src/app/cmn/ICRUDResult'));
        this.controllerFile.addImport('{IFormController}', 'angular');
        this.controllerClass.getConstructor().appendContent(`apiService.get<I${modelName}, IQueryResult<I${modelName}>>('${edge}/'+this.locals.id)
            .then(result=> {
                if (result.error) return $mdDialog.cancel(result.error);
                this.${modelInstanceName} = new ${modelName}(result.items[0]);
            })
            .catch(reason=>$mdDialog.cancel(reason));
        `);
        var closeMethod = this.controllerClass.addMethod('closeFormModal');
        closeMethod.setContent('this.$mdDialog.cancel();');
        var updateMethod = this.controllerClass.addMethod(`edit${modelName}`);
        updateMethod.setContent(`if (this.${formName}.$dirty == false) {
            this.$mdDialog.cancel();
            return;
        }
        var validate = this.formService.evaluate(this.${modelInstanceName}.validate(), this.${formName});
        if (!validate) return;
        var ${modelInstanceName} = this.${modelInstanceName}.getValues<I${modelName}>();
        this.apiService.put<I${modelName}, IUpsertResult<I${modelName}>>('${edge}', ${modelInstanceName})
            .then(result=> {
                if (result.error) {
                    if (result.error.code == Err.Code.Validation) {
                        this.formService.evaluate(result.error['violations'], this.${formName});
                    }
                    return this.notificationService.toast(result.error.message);
                }
                this.$mdDialog.hide(result.items[0]);
            })
            .catch(reason=> {
                this.$mdDialog.cancel(reason);
            });`);
    }
}