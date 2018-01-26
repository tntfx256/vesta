import { FieldType, IModelFields, RelationType } from "@vesta/core";
import { writeFileSync } from "fs";
import { genRelativePath, mkdir } from "../../../../util/FsUtil";
import { plural } from "../../../../util/StringUtil";
import { TsFileGen } from "../../../core/TSFileGen";
import { IFieldMeta } from "../../FieldGen";
import { ModelGen } from "../../ModelGen";
import { ICrudComponentGenConfig } from "../ComponentGen";

export class AddComponentGen {
    private className: string;
    private relationalFields: IModelFields;

    constructor(private config: ICrudComponentGenConfig) {
        this.className = `${config.modelConfig.originalClassName}Add`;
        mkdir(config.path);
    }

    public generate() {
        this.relationalFields = ModelGen.getFieldsByType(this.config.model, FieldType.Relation);
        const code = this.genCrudAddComponent();
        // generate file
        writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }

    private genCrudAddComponent() {
        const model = this.config.modelConfig;
        const path = this.config.path;
        const modelObject = ModelGen.getModel(this.config.modelConfig.originalClassName);
        const formClassName = `${this.config.modelConfig.originalClassName}Form`;
        // ts file
        const addFile = new TsFileGen(this.className);
        // imports
        addFile.addImport(["React"], "react", true);
        addFile.addImport(["IValidationError"], genRelativePath(path, "src/client/app/cmn/core/Validator"));
        addFile.addImport(["PageComponent", "PageComponentProps", "Save"], genRelativePath(path, "src/client/app/components/PageComponent"));
        addFile.addImport([formClassName], `./${formClassName}`);
        addFile.addImport([model.interfaceName], genRelativePath(path, `src/client/app/cmn/models/${model.originalClassName}`));
        // params
        addFile.addInterface(`${this.className}Params`);
        // props
        const addProps = addFile.addInterface(`${this.className}Props`);
        addProps.setParentClass(`PageComponentProps<${this.className}Params>`);
        addProps.addProperty({ name: "onSave", type: `Save<${model.interfaceName}>` });
        addProps.addProperty({ name: "validationErrors", type: "IValidationError" });
        const extProps = [];
        const extPassedProps = [];
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                const meta: IFieldMeta = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                if (!meta.form || !meta.relation.showAllOptions) { continue; }
                const shouldBePlural = modelObject.schema.getField(fieldNames[i]).properties.relation.type != RelationType.Many2Many;
                addFile.addImport([`I${meta.relation.model}`], genRelativePath(path, `src/client/app/cmn/models/${meta.relation.model}`));
                const pluralName = shouldBePlural ? plural(fieldNames[i]) : fieldNames[i];
                addProps.addProperty({
                    name: pluralName,
                    type: `Array<I${meta.relation.model}>`,
                });
                extProps.push(pluralName);
                extPassedProps.push(`${pluralName}={${pluralName}}`);
            }
        }
        const extPropsCode = extProps.length ? `, ${extProps.join(", ")}` : "";
        const extPassedPropsCode = extPassedProps.length ? ` ${extPassedProps.join(" ")}` : "";
        // state
        const addState = addFile.addInterface(`${this.className}State`);
        // class
        const addClass = addFile.addClass(this.className);
        addClass.setParentClass(`PageComponent<${this.className}Props, ${this.className}State>`);
        // render method
        addClass.addMethod("render").setContent(`const {onSave, validationErrors${extPropsCode}, history} = this.props;

        return (
            <div className="crud-page">
                <h1>{this.tr('title_record_add', this.tr('${model.originalClassName.toLowerCase()}'))}</h1>
                <${formClassName} onSave={onSave} validationErrors={validationErrors}${extPassedPropsCode}>
                    <div className="btn-group">
                        <button className="btn btn-primary" type="submit">{this.tr('add')}</button>
                        <button className="btn btn-outline" type="button"
                                onClick={history.goBack}>{this.tr('cancel')}</button>
                    </div>
                </${formClassName}>
            </div>
        )`);
        return addFile.generate();
    }
}
