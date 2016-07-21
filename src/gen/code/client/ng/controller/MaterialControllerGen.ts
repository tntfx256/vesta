import * as _ from "lodash";
import {Util} from "../../../../../util/Util";
import {ModelGen} from "../../../ModelGen";
import {BaseNGControllerGen} from "./BaseNGControllerGen";
import {ClassGen} from "../../../../core/ClassGen";
import {MaterialListGen} from "./../list/MaterialListGen";
import {TsFileGen} from "../../../../core/TSFileGen";
import {FieldType} from "vesta-schema/Field";

interface IFileFieldsCode {
    // updating address file src of fetched record (e.g. Setting.asset/model/record.image)
    address:string;
    // extracting files from model value (e.g. var image = model.image; delete model.image)
    extraction:string;
    // uploading extracted file (e.g. this.upload({image: image}))
    upload:string;
}

export class MaterialControllerGen extends BaseNGControllerGen {

    protected setModelRequiredInjections() {
        super.setModelRequiredInjections();
        // delete confirm dialog needs it, even if form is not displayed in modal
        this.addInjection({
            name: '$mdDialog',
            type: 'IDialogService',
            path: 'angular.material.IDialogService',
            isLib: true,
            importType: TsFileGen.ImportType.Namespace
        });
    }

    public setAsListController() {
        this.setModelRequiredInjections();
        let modelName = ModelGen.extractModelName(this.config.model);
        let ctrlName = _.camelCase(this.config.name),
            capitalize = _.capitalize(ctrlName),
            modelInstanceName = _.camelCase(modelName),
            modelPlural = Util.plural(_.camelCase(modelName)),
            url = (this.config.module ? (this.config.module + '/') : '') + ctrlName + '/',
            edge = Util.joinPath(this.config.module, ctrlName),
            modelListName = `${modelPlural}List`,
            modelSelectedListName = `selected${_.capitalize(modelPlural)}List`;
        this.controllerFile.addImport(`{IQueryRequest, IQueryResult, IDeleteResult}`, 'vesta-schema/ICRUDResult');
        this.controllerFile.addImport(`{ExtArray}`, 'vesta-util/ExtArray');
        this.controllerClass.addProperty({
            name: modelListName,
            type: `ExtArray<I${modelName}>`,
            access: ClassGen.Access.Private,
            defaultValue: `new ExtArray<I${modelName}>()`
        });
        this.controllerClass.addProperty({
            name: modelSelectedListName,
            type: `Array<number>`,
            access: ClassGen.Access.Private,
            defaultValue: `[]`
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
        this.controllerClass.getConstructor().appendContent(`this.dtOption = this.getDataTableOptions('List of ${modelPlural}', this.loadMore.bind(this));
        this.acl = this.authService.getActionsOn('${modelInstanceName}');
        this.apiService.get<IQueryRequest<I${modelName}>, IQueryResult<I${modelName}>>('${edge}')
            .then(result=> {
                this.${modelListName}.set(result.items);
                this.dtOption.total = result.total;
            })
            .catch(err=> this.notificationService.toast(err.message));`);
        this.controllerFile.addImport('IDialogOptions', 'angular.material.IDialogOptions', TsFileGen.ImportType.Namespace);
        // loadMore
        let loadMoreMethod = this.controllerClass.addMethod('loadMore');
        loadMoreMethod.addParameter({name: 'page', type: 'number'});
        loadMoreMethod.setContent(`if (this.busy || page <= this.currentPage) return;
        this.busy = true;
        this.apiService.get<IQueryRequest<I${modelName}>, IQueryResult<I${modelName}>>('${edge}', {
            limit: this.dtOption.limit,
            page: ++this.currentPage
        }).then(result=> {
            for (let i = 0; i < result.items.length; i++) {
                this.${modelListName}.push(result.items[i]);
            }
            this.dtOption.total = result.total;
            this.busy = false;
        }).catch(err=> this.notificationService.toast(err.message));`);
        // add anf edit method should only exists in case of modals
        if (this.config.openFormInModal) {
            // add method
            let addMethod = this.controllerClass.addMethod(`add${modelName}`);
            addMethod.addParameter({name: 'event', type: 'MouseEvent'});
            addMethod.setContent(`this.$mdDialog.show(<IDialogOptions>{
            controller: '${ctrlName}AddController',
            controllerAs: 'vm',
            templateUrl: 'tpl/${url}${ctrlName}AddForm.html',
            parent: angular.element(document.body),
            targetEvent: event
        }).then((${modelInstanceName}) => {
            this.${modelPlural}List.push(${modelInstanceName});
            this.notificationService.toast('New ${modelInstanceName} has been added successfully');
        }).catch(err=> err && this.notificationService.toast(err.message))`);
            // edit method
            let editMethod = this.controllerClass.addMethod(`edit${modelName}`);
            editMethod.addParameter({name: 'event', type: 'MouseEvent'});
            editMethod.addParameter({name: 'id', type: 'number'});
            editMethod.setContent(`event.stopPropagation();
        this.$mdDialog.show(<IDialogOptions>{
            controller: '${ctrlName}EditController',
            controllerAs: 'vm',
            templateUrl: 'tpl/${url}${ctrlName}EditForm.html',
            parent: angular.element(document.body),
            targetEvent: event,
            locals: {
                id: id
            }
        }).then((${modelInstanceName}: I${modelName}) => {
            this.${modelListName}[this.${modelListName}.indexOfByProperty('id', ${modelInstanceName}.id)] = ${modelInstanceName};
            this.notificationService.toast('${modelInstanceName} has been updated successfully');
        }).catch(err=> err && this.notificationService.toast(err.message))`);
        }
        // delete method
        let delMethod = this.controllerClass.addMethod(`del${modelName}`);
        delMethod.addParameter({name: 'event', type: 'MouseEvent'});
        delMethod.setContent(`let confirm = this.$mdDialog.confirm()
            .parent(angular.element(document.body))
            .title('Delete confirmation')
            .textContent('Are you sure about deleting the select ${modelInstanceName}')
            .targetEvent(event)
            .ok('Yes').cancel('No');
        this.$mdDialog.show(confirm)
            .then(() => this.apiService.delete<Array<number>, IDeleteResult>('${edge}', this.${modelSelectedListName}))
            .then(result=> {
                this.${modelListName}.removeByProperty('id', this.${modelSelectedListName});
                this.${modelSelectedListName} = [];
                this.notificationService.toast(result.items.length + ' ${modelInstanceName} has been deleted successfully');
            })
            .catch(err=> this.notificationService.toast(err.message));`);
        // template
        let template = new MaterialListGen(this.config);
        template.generate();
    }

    public setAsAddController() {
        this.isSpecialController = true;
        let ctrlName = _.camelCase(this.config.name),
            modelName = ModelGen.extractModelName(this.config.model),
            modelInstanceName = _.camelCase(modelName),
            formName = `${modelInstanceName}Form`,
            edge = Util.joinPath(this.config.module, ctrlName);
        this.controllerFile.name = _.capitalize(ctrlName) + 'AddController';
        this.controllerClass.name = this.controllerFile.name;
        this.controllerClass.addProperty({name: formName, type: 'IFormController', access: ClassGen.Access.Private});
        this.controllerFile.addImport(`{IUpsertResult, IQueryResult}`, 'vesta-schema/ICRUDResult');
        this.controllerFile.addImport('{IFormController}', 'angular');
        this.controllerClass.getConstructor().appendContent(`this.${modelInstanceName} = new ${modelName}();`);
        let closeMethod = this.controllerClass.addMethod('closeFormModal');
        closeMethod.setContent('this.$mdDialog.cancel();');
        this.setModelRequiredInjections();
        this.genMethodsForRelations();
        let addMethod = this.controllerClass.addMethod(`add${modelName}`);
        let fileCodes = this.genCodeForFiles(true);
        let thenCode = fileCodes.upload ? `{
                this.${modelInstanceName}.id = result.items[0].id;${fileCodes.upload}
            }` : `this.${modelInstanceName}.id = result.items[0].id`;
        addMethod.setContent(`let validate = this.formService.evaluate(this.${modelInstanceName}.validate(), this.${formName});
        if (!validate) return this.notificationService.toast('Invalid form data');
        let ${modelInstanceName} = this.${modelInstanceName}.getValues<I${modelName}>();${fileCodes.extraction}
        this.apiService.post<I${modelName}, IUpsertResult<I${modelName}>>('${edge}', ${modelInstanceName})
            .then(result=> ${thenCode})
            .then(()=> this.$mdDialog.hide(this.${modelInstanceName}))
            .catch(err=> {
                this.notificationService.toast(err.message);
                if (err.code == Err.Code.Validation) {
                    this.formService.evaluate((<ValidationError>err).violations, this.${formName});
                }
            });`);
    }

    public setAsEditController() {
        this.isSpecialController = true;
        let ctrlName = _.camelCase(this.config.name),
            modelName = ModelGen.extractModelName(this.config.model),
            modelInstanceName = _.camelCase(modelName),
            formName = `${modelInstanceName}Form`,
            edge = Util.joinPath(this.config.module, ctrlName);
        this.controllerFile.name = _.capitalize(ctrlName) + 'EditController';
        this.controllerClass.name = this.controllerFile.name;
        this.controllerClass.addProperty({name: formName, type: 'IFormController', access: ClassGen.Access.Private});
        this.controllerFile.addImport(`{IQueryRequest, IQueryResult, IUpsertResult}`, 'vesta-schema/ICRUDResult');
        this.controllerFile.addImport('{IFormController}', 'angular');
        this.addInjection({name: 'locals', type: 'any', path: '', isLib: true});
        let fileCodes = this.genCodeForFiles(false);
        let thenCode = this.fileTypesFields ? `{
                this.${modelInstanceName} = new ${modelName}(result.items[0]);${fileCodes.address}
            }` : `this.${modelInstanceName} = new ${modelName}(result.items[0])`;
        this.controllerClass.getConstructor().appendContent(`this.apiService.get<IQueryRequest<I${modelName}>, IQueryResult<I${modelName}>>(\`${edge}/\${this.locals.id}\`)
            .then(result=> ${thenCode})
            .catch(reason=> $mdDialog.cancel(reason));`);
        let closeMethod = this.controllerClass.addMethod('closeFormModal');
        closeMethod.setContent('this.$mdDialog.cancel();');
        this.setModelRequiredInjections();
        this.genMethodsForRelations();
        let updateMethod = this.controllerClass.addMethod(`edit${modelName}`);
        thenCode = fileCodes.upload ? `{
                this.${modelInstanceName}.id = result.items[0].id;${fileCodes.upload}
            }` : `this.${modelInstanceName}.id = result.items[0].id`;
        updateMethod.setContent(`if (!this.${formName}.$dirty) return this.notificationService.toast('Nothing changed');
        let validate = this.formService.evaluate(this.${modelInstanceName}.validate(), this.${formName});
        if (!validate) return this.notificationService.toast('Invalid form data');
        let ${modelInstanceName} = this.${modelInstanceName}.getValues<I${modelName}>();${fileCodes.extraction}
        this.apiService.put<I${modelName}, IUpsertResult<I${modelName}>>('${edge}', ${modelInstanceName})
            .then(result=> ${thenCode})
            .then(()=> this.$mdDialog.hide(this.${modelInstanceName}))
            .catch(err=> {
                this.notificationService.toast(err.message);
                if (err.code == Err.Code.Validation) {
                    this.formService.evaluate((<ValidationError>err).violations, this.${modelInstanceName}Form);
                }
            });`);
    }

    private genCodeForFiles(isInsert:boolean):IFileFieldsCode {
        let code:IFileFieldsCode = {address: '', extraction: '', upload: ''};
        if (!this.fileTypesFields) return code;
        let ctrlName = _.camelCase(this.config.name),
            modelName = ModelGen.extractModelName(this.config.model),
            modelInstanceName = _.camelCase(modelName),
            edge = Util.joinPath(this.config.module, ctrlName);
        let model = ModelGen.getModel(modelName);
        code.extraction = `
        let files:IFileKeyValue = {};`;
        for (let fileNames = Object.keys(this.fileTypesFields), i = 0, il = fileNames.length; i < il; ++i) {
            var fileName = fileNames[i];
            if (!model) continue;
            let isList = model.schema.getField(fileName).properties.type == FieldType.List;
            let typeCasting = isList ? `<Array<File>>` : `<File>`;
            let listCheck = isList ? `[0]` : '';
            let extCode = isInsert ? '' : ` && typeof ${modelInstanceName}.${fileName}${listCheck} !== 'string'`;
            code.extraction += `
        if (${modelInstanceName}.${fileName}${extCode}) files['${fileName}'] = ${typeCasting}${modelInstanceName}.${fileName};
        delete ${modelInstanceName}.${fileName};`
        }
        code.upload = `
                if (Object.keys(files).length) return this.upload(\`${edge}/file/\${this.${modelInstanceName}.id}\`, files);`;
        if (!isInsert) {
            let fileNames = Object.keys(this.fileTypesFields);
            for (let i = 0, il = fileNames.length; i < il; ++i) {
                let isList = model.schema.getField(fileNames[i]).properties.type == FieldType.List;
                code.address += isList ? `
                for (let i = this.${modelInstanceName}.${fileNames[i]}.length; i--;) this.${modelInstanceName}.${fileNames[i]}[i] = \`\${Setting.asset}/${modelInstanceName}/\${this.${modelInstanceName}.${fileNames[i]}[i]}\`;` : `
                this.${modelInstanceName}.${fileNames[i]} = \`\${Setting.asset}/${modelInstanceName}/\${this.${modelInstanceName}.${fileNames[i]}}\`;`;
            }
        }
        return code;
    }

    private genMethodsForRelations() {
        if (!this.relationTypesFields) return;
        for (let relations = Object.keys(this.relationTypesFields), i = 0, il = relations.length; i < il; ++i) {
            let field = relations[i];
            this.controllerFile.addImport('{IPromise, IQService}', 'angular');
            this.addInjection({name: '$q', type: 'IQService', isLib: true});
            let targetModelName = this.relationTypesFields[field].properties.relation.model.schema.name;
            let targetModelInstanceName = _.camelCase(targetModelName);
            let targetFieldName = ModelGen.getUniqueFieldNameOfRelatedModel(this.relationTypesFields[field]);
            this.controllerFile.addImport(`{I${targetModelName}}`, Util.genRelativePath(this.path, `src/app/cmn/models/${targetModelName}`));
            let upcField = _.capitalize(field);
            // this method will search items from server
            let search = this.controllerClass.addMethod(`search${upcField}`);
            search.addParameter({name: 'searchText', type: 'string'});
            search.setReturnType(`IPromise<I${targetModelName}|void>`);
            search.setContent(`return this.apiService.get<I${targetModelName}, IQueryResult<I${targetModelName}>>('${targetModelInstanceName}', {${targetFieldName}: searchText})
            .then(result=> result.items)
            .catch(err=> this.notificationService.toast(\`Failed fetching ${field} because of \${err.message}\`))`);
        }
    }
}