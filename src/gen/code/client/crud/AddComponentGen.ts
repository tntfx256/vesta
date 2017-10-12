import * as fs from "fs";
import {CrudComponentGenConfig} from "../ComponentGen";
import {TsFileGen} from "../../../core/TSFileGen";
import {camelCase, plural, strRepeat} from "../../../../util/StringUtil";
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
        addFile.addImport('React', 'react');
        addFile.addImport('{IValidationError}', genRelativePath(path, 'src/client/app/medium'));
        addFile.addImport('{PageComponent, PageComponentProps, PageComponentState}', genRelativePath(path, 'src/client/app/components/PageComponent'));
        addFile.addImport(`{${formClassName}}`, `./${formClassName}`);
        addFile.addImport(`{FormWrapper, SubmitEventHandler}`, genRelativePath(path, `src/client/app/components/general/form/FormWrapper`));
        addFile.addImport(`{${model.interfaceName}}`, genRelativePath(path, `src/client/app/cmn/models/${model.originalClassName}`));
        // params
        addFile.addInterface(`${this.className}Params`);
        // props
        let addProps = addFile.addInterface(`${this.className}Props`);
        addProps.setParentClass(`PageComponentProps<${this.className}Params>`);
        addProps.addProperty({name: 'save', type: 'SubmitEventHandler'});
        addProps.addProperty({name: 'validationErrors', type: 'IValidationError'});
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                let meta: IFieldMeta = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                addFile.addImport(`{I${meta.relation.model}}`, genRelativePath(path, `src/client/app/cmn/models/${meta.relation.model}`));
                addProps.addProperty({
                    name: `${plural(fieldNames[i])}`,
                    type: `Array<I${meta.relation.model}>`
                });
            }
        }
        // state
        let addState = addFile.addInterface(`${this.className}State`);
        addState.setParentClass('PageComponentState');
        addState.addProperty({name: model.instanceName, type: model.interfaceName});
        // class
        let addClass = addFile.addClass(this.className);
        addClass.setParentClass(`PageComponent<${this.className}Props, ${this.className}State>`);
        addClass.getConstructor().addParameter({name: 'props', type: `${this.className}Props`});
        addClass.getConstructor().setContent(`super(props);
        this.state = {${model.instanceName}: {}};`);
        // onChange method
        let onChange = addClass.addMethod('onChange');
        onChange.setAsArrowFunction(true);
        onChange.addParameter({name: 'name', type: 'string'});
        onChange.addParameter({name: 'value', type: 'any'});
        onChange.setContent(`this.state.${model.instanceName}[name] = value;
        this.setState({${model.instanceName}: this.state.${model.instanceName}});`);
        // onSubmit method
        let onSubmit = addClass.addMethod('onSubmit');
        onSubmit.setAsArrowFunction(true);
        onSubmit.addParameter({name: 'e', type: 'Event'});
        onSubmit.setContent(`this.props.save(this.state.${model.instanceName});`);
        // render method
        addClass.addMethod('render').setContent(`return (
            <div className="crud-page">
                <h1>{this.tr('title_record_add', this.tr('mdl_${model.originalClassName.toLowerCase()}'))}</h1>
                <div className="form-wrapper">
                    <FormWrapper onSubmit={this.onSubmit}>
                        <${formClassName} ${model.instanceName}={this.state.${model.instanceName}} onChange={this.onChange} 
                         ${strRepeat(' ', formClassName.length)} errors={this.props.validationErrors}/>
                        <div className="btn-group">
                            <button className="btn btn-primary" type="submit">Add New ${model.originalClassName}</button>
                            <button className="btn" type="button" onClick={this.props.history.goBack}>Cancel</button>
                        </div>
                    </FormWrapper>
                </div>
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