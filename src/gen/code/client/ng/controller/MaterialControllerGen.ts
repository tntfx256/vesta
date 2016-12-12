import * as _ from "lodash";
import {Util} from "../../../../../util/Util";
import {ModelGen} from "../../../ModelGen";
import {BaseNGControllerGen} from "./BaseNGControllerGen";
import {ClassGen} from "../../../../core/ClassGen";
import {TsFileGen} from "../../../../core/TSFileGen";
import {FieldType, Field, RelationType} from "vesta-schema/Field";
import {StringUtil} from "../../../../../util/StringUtil";
import {MaterialListGen} from "../list/MaterialListGen";

interface IFileFieldsCode {
    // updating address file src of fetched record (e.g. Setting.asset/model/record.image)
    address: string;
    // extracting files from model value (e.g. var image = model.image; delete model.image)
    extraction: string;
    // uploading extracted file (e.g. this.upload({image: image}))
    upload: string;
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

    private getDataTableColumnsCode(): string {
        let model = ModelGen.getModel(this.config.model);
        let modelName = model.schema.name;
        let modelInstanceName = _.camelCase(modelName);
        let fields = model.schema.getFields();
        let code = '';
        for (let fieldNames = Object.keys(fields), i = 0, il = fieldNames.length; i < il; ++i) {
            let fieldName = fieldNames[i];
            if (fieldName == 'id') continue;
            let field: Field = fields[fieldName];
            if ([FieldType.File, FieldType.List, FieldType.Object, FieldType.Text, FieldType.Password].indexOf(field.properties.type) >= 0) continue;
            // many to many relations
            if (field.properties.type == FieldType.Relation && field.properties.relation.type == RelationType.Many2Many) continue;
            let type = 'String';
            let options = '';
            switch (field.properties.type) {
                case FieldType.Tel:
                    type = 'Tel';
                    break;
                case FieldType.String:
                    type = 'String';
                    break;
                case FieldType.EMail:
                    type = 'EMail';
                    break;
                case FieldType.URL:
                    type = 'URL';
                    break;
                case FieldType.Number:
                    type = 'Number';
                    break;
                case FieldType.Integer:
                    type = 'Integer';
                    break;
                case FieldType.Float:
                    type = 'Float';
                    break;
                case FieldType.Timestamp:
                    type = 'Timestamp';
                    break;
                case FieldType.Boolean:
                    type = 'Boolean';
                    break;
                case FieldType.Enum:
                    let enumName = `${modelName}${_.capitalize(field.fieldName)}`;
                    type = 'Enum';
                    options = `,
                render: (${modelInstanceName}: ${modelName})=> this.translate(${enumName}[${modelInstanceName}.${fieldName}]),
                options: ${enumName}`;
                    break;
                case FieldType.Relation:
                    type = 'Relation';
                    break;
            }
            code += `,
            ${fieldName}: {
                text: this.translate('${fieldName}'),
                type: FieldType.${type}${options}
            }`;
        }
        return code.substr(1);
    }

    public setAsListController() {
        this.setModelRequiredInjections();
        let modelName = ModelGen.extractModelName(this.config.model);
        let ctrlName = _.camelCase(this.config.name);
        let modelInstanceName = _.camelCase(modelName);
        let modelInstancePlural = Util.plural(_.camelCase(modelName));
        let modelPlural = StringUtil.fcUpper(modelInstancePlural);
        let url = (this.config.module ? (this.config.module + '/') : '') + ctrlName + '/';
        let edge = Util.joinPath(this.config.module, ctrlName);
        let modelListName = `${modelInstancePlural}List`;
        this.controllerFile.addImport(`{IQueryRequest, IQueryResult}`, 'vesta-schema/ICRUDResult');
        this.controllerFile.addImport(`{FieldType}`, 'vesta-schema/Field');
        this.controllerFile.addImport(`{Permission}`, Util.genRelativePath(this.path, 'src/app/cmn/models/Permission'));
        this.controllerFile.addImport(`{IDataTableOptions, IDataTableColumns}`, Util.genRelativePath(this.path, 'src/app/directive/datatable'));
        this.controllerClass.addProperty({
            name: modelListName,
            type: `Array<I${modelName}>`,
            access: ClassGen.Access.Private,
            defaultValue: '[]'
        });
        this.controllerClass.addProperty({
            name: 'dtOptions',
            type: `IDataTableOptions`,
            access: ClassGen.Access.Private
        });
        this.controllerClass.addProperty({
            name: 'dtColumns',
            type: `IDataTableColumns<I${modelName}>`,
            access: ClassGen.Access.Private
        });
        this.controllerClass.addProperty({
            name: 'busy',
            type: `boolean`,
            access: ClassGen.Access.Private,
            defaultValue: 'false'
        });
        this.controllerClass.getConstructor().appendContent(`this.metaTagsService.setTitle(this.translate('${modelName}'));
        this.acl = this.authService.getActionsOn('${modelInstanceName}');
        this.initDataTable();
        this.fetch${modelPlural}({page: 1, limit: this.dtOptions.limit});`);
        this.controllerFile.addImport('IDialogOptions', 'angular.material.IDialogOptions', TsFileGen.ImportType.Namespace);
        // initDataTable
        let initMethod = this.controllerClass.addMethod(`initDataTable`);
        initMethod.setContent(`this.dtOptions = this.getDataTableOptions();
        this.dtOptions.operations = {
            read: this.fetch${modelPlural}.bind(this),
            add: this.acl[Permission.Action.Add] ? this.add${modelName}.bind(this) : null,
            edit: this.acl[Permission.Action.Edit] ? this.edit${modelName}.bind(this) : null,
            del: this.acl[Permission.Action.Delete] ? this.del${modelName}.bind(this) : null
        };
        this.dtColumns = {${this.getDataTableColumnsCode()}
        };`);
        // read
        let loadMoreMethod = this.controllerClass.addMethod(`fetch${modelPlural}`);
        loadMoreMethod.addParameter({name: 'option', type: `IQueryRequest<I${modelName}>`});
        loadMoreMethod.setContent(`if (this.busy) return;
        this.busy = true;
        this.apiService.get<IQueryRequest<I${modelName}>, IQueryResult<I${modelName}>>('${edge}', option)
            .then(result=> {
                this.${modelListName} = result.items;
                this.busy = false;
            })
            .catch(err=> {
                this.notificationService.toast(this.translate(err.message));
                this.busy = false;
            });
        if (option.page == 1) {
            this.apiService.get<IQueryRequest<I${modelName}>, IQueryResult<I${modelName}>>('${edge}/count', option)
                .then(result=> this.dtOptions.total = result.total)
                .catch(err=> this.notificationService.toast(this.translate(err.message)));
        }`);
        // add & edit method should only exists in case of modals
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
            this.${modelListName}.push(${modelInstanceName});
            this.notificationService.toast(this.translate('info_add_record', this.translate('${modelInstanceName}')));
        }).catch(err=> err && this.notificationService.toast(this.translate(err.message)))`);
            // edit method
            let editMethod = this.controllerClass.addMethod(`edit${modelName}`);
            editMethod.addParameter({name: 'event', type: 'MouseEvent'});
            editMethod.addParameter({name: 'index', type: 'number'});
            editMethod.setContent(`let ${modelInstanceName}Id = this.${modelListName}[index].id;
        this.$mdDialog.show(<IDialogOptions>{
            controller: '${ctrlName}EditController',
            controllerAs: 'vm',
            templateUrl: 'tpl/${url}${ctrlName}EditForm.html',
            parent: angular.element(document.body),
            targetEvent: event,
            locals: {id: ${modelInstanceName}Id}
        }).then((${modelInstanceName}: I${modelName}) => {
            this.${modelListName}[this.findByProperty(this.${modelListName}, 'id', ${modelInstanceName}.id)] = ${modelInstanceName};
            this.notificationService.toast('${modelInstanceName} has been updated successfully');
        }).catch(err=> this.notificationService.toast(this.translate(err.message)))`);
        }
        // delete method
        let delMethod = this.controllerClass.addMethod(`del${modelName}`);
        delMethod.addParameter({name: 'event', type: 'MouseEvent'});
        delMethod.addParameter({name: 'index', type: 'number'});
        delMethod.setContent(`let ${modelInstanceName}Id = this.${modelListName}[index].id;
        let confirm = this.$mdDialog.confirm()
            .parent(angular.element(document.body))
            .title(this.translate('title_delete_confirm'))
            .textContent(this.translate('msg_delete_confirm', this.translate('${modelInstanceName}')))
            .targetEvent(event)
            .ok(this.translate('yes')).cancel(this.translate('no'));
        this.$mdDialog.show(confirm)
            .then(()=> this.apiService.delete(\`${edge}/\${${modelInstanceName}Id}\`))
            .then(()=> {
                this.${modelListName}.splice(this.findByProperty(this.${modelListName}, 'id', ${modelInstanceName}Id), 1);
                this.notificationService.toast(this.translate('info_delete_record', this.translate('${modelInstanceName}')));
            })
            .catch(err=> this.notificationService.toast(this.translate(err.message)));`);
        // // template
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
        this.controllerFile.name = StringUtil.fcUpper(ctrlName) + 'AddController';
        this.controllerClass.name = this.controllerFile.name;
        this.controllerClass.addProperty({name: formName, type: 'IFormController', access: ClassGen.Access.Private});
        this.controllerFile.addImport(`{IUpsertResult, IQueryResult}`, 'vesta-schema/ICRUDResult');
        this.controllerFile.addImport('{IFormController}', 'angular');
        if (!this.config.openFormInModal) {
            this.controllerClass.getConstructor().appendContent(`this.metaTagsService.setTitle(this.translate('title_record_add', this.translate('${modelName}')));
        `);
        }
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
                this.notificationService.toast(this.translate(err.message));
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
        this.controllerFile.name = StringUtil.fcUpper(ctrlName) + 'EditController';
        this.controllerClass.name = this.controllerFile.name;
        this.controllerClass.addProperty({name: formName, type: 'IFormController', access: ClassGen.Access.Private});
        this.controllerFile.addImport(`{IQueryRequest, IQueryResult, IUpsertResult}`, 'vesta-schema/ICRUDResult');
        this.controllerFile.addImport('{IFormController}', 'angular');
        this.addInjection({name: 'locals', type: 'any', path: '', isLib: true});
        let fileCodes = this.genCodeForFiles(false);
        let thenCode = this.fileTypesFields ? `{
                this.${modelInstanceName} = new ${modelName}(result.items[0]);${fileCodes.address}
            }` : `this.${modelInstanceName} = new ${modelName}(result.items[0])`;
        if (!this.config.openFormInModal) {
            this.controllerClass.getConstructor().appendContent(`this.metaTagsService.setTitle(this.translate('title_record_edit', this.translate('${modelName}')));
        `);
        }
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
        updateMethod.setContent(`if (!this.${formName}.$dirty) return;
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

    private genCodeForFiles(isInsert: boolean): IFileFieldsCode {
        let code: IFileFieldsCode = {address: '', extraction: '', upload: ''};
        if (!this.fileTypesFields) return code;
        let ctrlName = _.camelCase(this.config.name),
            modelName = ModelGen.extractModelName(this.config.model),
            modelInstanceName = _.camelCase(modelName),
            edge = Util.joinPath(this.config.module, ctrlName);
        let model = ModelGen.getModel(modelName);
        code.extraction = `
        let files: IFileKeyValue = {};`;
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
                for (let i = this.${modelInstanceName}.${fileNames[i]}.length; i--;) this.${modelInstanceName}.${fileNames[i]}[i] = \`\${this.Setting.asset}/${modelInstanceName}/\${this.${modelInstanceName}.${fileNames[i]}[i]}\`;` : `
                this.${modelInstanceName}.${fileNames[i]} = \`\${this.Setting.asset}/${modelInstanceName}/\${this.${modelInstanceName}.${fileNames[i]}}\`;`;
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
            let upcField = StringUtil.fcUpper(field);
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