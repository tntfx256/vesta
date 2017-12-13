import * as fs from "fs";
import {CrudComponentGenConfig} from "../ComponentGen";
import {TsFileGen} from "../../../core/TSFileGen";
import {camelCase, plural} from "../../../../util/StringUtil";
import {genRelativePath, mkdir} from "../../../../util/FsUtil";
import {FieldType, IModelFields} from "@vesta/core";
import {ModelGen} from "../../ModelGen";
import {IFieldMeta} from "../../FieldGen";

export class AddComponentGen {
    private className: string;
    private relationalFields: IModelFields;

    constructor(private config: CrudComponentGenConfig) {
        this.className = `${config.modelConfig.originalClassName}Add`;
        mkdir(config.path);
    }

    private genCrudAddComponent() {
        let model = this.config.modelConfig;
        let path = this.config.path;
        let stateName = camelCase(this.config.name);
        let formClassName = `${this.config.modelConfig.originalClassName}Form`;
        // ts file
        let addFile = new TsFileGen(this.className);
        // imports
        addFile.addImport(['React'], 'react', true);
        addFile.addImport(['IValidationError'], genRelativePath(path, 'src/client/app/cmn/core/Validator'));
        addFile.addImport(['PageComponent', 'PageComponentProps', 'PageComponentState', 'Save'], genRelativePath(path, 'src/client/app/components/PageComponent'));
        addFile.addImport([formClassName], `./${formClassName}`);
        addFile.addImport([model.interfaceName], genRelativePath(path, `src/client/app/cmn/models/${model.originalClassName}`));
        // params
        addFile.addInterface(`${this.className}Params`);
        // props
        let addProps = addFile.addInterface(`${this.className}Props`);
        addProps.setParentClass(`PageComponentProps<${this.className}Params>`);
        addProps.addProperty({name: 'onSave', type: `Save<${model.interfaceName}>`});
        addProps.addProperty({name: 'validationErrors', type: 'IValidationError'});
        let extProps = [];
        let extPassedProps = [];
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                let meta: IFieldMeta = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                addFile.addImport([`I${meta.relation.model}`], genRelativePath(path, `src/client/app/cmn/models/${meta.relation.model}`));
                let pluralName = plural(fieldNames[i]);
                addProps.addProperty({
                    name: `${plural(fieldNames[i])}`,
                    type: `Array<I${meta.relation.model}>`
                });
                extProps.push(plural(fieldNames[i]));
                extPassedProps.push(`${pluralName}={${pluralName}}`);
            }
        }
        let extPropsCode = extProps.length ? `, ${extProps.join(', ')}` : '';
        let extPassedPropsCode = extPassedProps.length ? ` ${extPassedProps.join(' ')}` : '';
        // state
        let addState = addFile.addInterface(`${this.className}State`);
        addState.setParentClass('PageComponentState');
        // class
        let addClass = addFile.addClass(this.className);
        addClass.setParentClass(`PageComponent<${this.className}Props, ${this.className}State>`);
        // render method
        addClass.addMethod('render').setContent(`let {onSave, validationErrors${extPropsCode}} = this.props;
        return (
            <div className="crud-page">
                <h1>{this.tr('title_record_add', this.tr('mdl_${model.originalClassName.toLowerCase()}'))}</h1>
                <${formClassName} onSave={onSave} validationErrors={validationErrors}${extPassedPropsCode}>
                    <div className="btn-group">
                        <button className="btn btn-primary" type="submit">{this.tr('add')}</button>
                        <button className="btn" type="button" onClick={this.props.history.goBack}>{this.tr('cancel')}</button>
                    </div>
                </${formClassName}>
            </div>
        )`);
        return addFile.generate();
    }

    public generate() {
        this.relationalFields = ModelGen.getFieldsByType(this.config.model, FieldType.Relation);
        let code = this.genCrudAddComponent();
        // generate file
        fs.writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }
}