import * as fs from "fs";
import {CrudComponentGenConfig} from "../ComponentGen";
import {TsFileGen} from "../../../core/TSFileGen";
import {genRelativePath, mkdir} from "../../../../util/FsUtil";
import {FieldType, IModelFields} from "@vesta/core";
import {IFieldMeta} from "../../FieldGen";
import {ModelGen} from "../../ModelGen";
import {plural} from "../../../../util/StringUtil";

export class EditComponentGen {
    private className: string;
    private relationalFields: IModelFields;

    constructor(private config: CrudComponentGenConfig) {
        this.className = `${config.modelConfig.originalClassName}Edit`;
        mkdir(config.path);
    }

    private genCrudEditComponent() {
        let model = this.config.modelConfig;
        let path = this.config.path;
        let formClassName = `${this.config.modelConfig.originalClassName}Form`;
        // ts file
        let editFile = new TsFileGen(this.className);
        // imports
        editFile.addImport(['React'], 'react', true);
        editFile.addImport(['IValidationError'], genRelativePath(path, 'src/client/app/medium'));
        editFile.addImport(['FetchById', 'PageComponent', 'PageComponentProps', 'PageComponentState', 'Save'], genRelativePath(path, 'src/client/app/components/PageComponent'));
        editFile.addImport([formClassName], `./${formClassName}`);
        editFile.addImport([model.interfaceName], genRelativePath(path, `src/client/app/cmn/models/${model.originalClassName}`));
        // params
        editFile.addInterface(`${this.className}Params`).addProperty({name: 'id', type: 'number'});
        // props
        let editProps = editFile.addInterface(`${this.className}Props`);
        editProps.setParentClass(`PageComponentProps<${this.className}Params>`);
        editProps.addProperty({name: 'fetch', type: `FetchById<${model.interfaceName}>`});
        editProps.addProperty({name: 'save', type: `Save<${model.interfaceName}>`});
        editProps.addProperty({name: 'validationErrors', type: 'IValidationError'});
        let extProps = [];
        let extPassedProps = [];
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                let meta: IFieldMeta = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                editFile.addImport([`I${meta.relation.model}`], genRelativePath(path, `src/client/app/cmn/models/${meta.relation.model}`));
                let pluralName = plural(fieldNames[i]);
                editProps.addProperty({
                    name: `${pluralName}`,
                    type: `Array<I${meta.relation.model}>`
                });
                extProps.push(pluralName);
                extPassedProps.push(`${pluralName}={${pluralName}}`);
            }
        }
        let extPropsCode = extProps.length ? `, ${extProps.join(', ')}` : '';
        let extPassedPropsCode = extPassedProps.length ? ` ${extPassedProps.join(' ')}` : '';
        // state
        let editState = editFile.addInterface(`${this.className}State`);
        editState.setParentClass('PageComponentState');
        // class
        let editClass = editFile.addClass(this.className);
        editClass.setParentClass(`PageComponent<${this.className}Props, ${this.className}State>`);
        // render method
        editClass.addMethod('render').setContent(`let {save, fetch, validationErrors${extPropsCode}} = this.props;
        const id = +this.props.match.params.id;
        return (
            <div className="crud-page">
                <h1>{this.tr('title_record_edit', this.tr('mdl_${model.originalClassName.toLowerCase()}'))}</h1>
                <${formClassName} id={id} fetch={fetch} save={save} validationErrors={validationErrors}${extPassedPropsCode}>
                    <div className="btn-group">
                        <button className="btn btn-primary" type="submit">{this.tr('save')}</button>
                        <button className="btn" type="button" onClick={this.props.history.goBack}>{this.tr('cancel')}</button>
                    </div>
                </${formClassName}>
            </div>
        )`);
        return editFile.generate();
    }

    public generate() {
        this.relationalFields = ModelGen.getFieldsByType(this.config.model, FieldType.Relation);
        let code = this.genCrudEditComponent();
        // generate file
        fs.writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }
}