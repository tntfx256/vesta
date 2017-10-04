import * as fs from "fs";
import {CrudComponentGenConfig} from "../ComponentGen";
import {TsFileGen} from "../../../core/TSFileGen";
import {genRelativePath, mkdir} from "../../../../util/FsUtil";
import {camelCase} from "../../../../util/StringUtil";

export class EditComponentGen {
    private className: string;

    constructor(private config: CrudComponentGenConfig) {
        this.className = `${config.modelConfig.originalClassName}Edit`;
        mkdir(config.path);
    }

    private genCrudEditComponent() {
        let model = this.config.modelConfig;
        let path = this.config.path;
        let stateName = camelCase(this.config.name);
        let formClassName = `${this.config.modelConfig.originalClassName}Form`;
        // ts file
        let editFile = new TsFileGen(this.className);
        // imports
        editFile.addImport('React', 'react');
        editFile.addImport('{IValidationError}', genRelativePath(path, 'src/client/app/medium'));
        editFile.addImport('{FetchById, PageComponent, PageComponentProps, PageComponentState}', genRelativePath(path, 'src/client/app/components/PageComponent'));
        editFile.addImport(`{${formClassName}}`, `./${formClassName}`);
        editFile.addImport(`{${model.interfaceName}}`, genRelativePath(path, `src/client/app/cmn/models/${model.originalClassName}`));
        editFile.addImport(`{FormWrapper, SubmitEventHandler}`, genRelativePath(path, `src/client/app/components/general/form/FormWrapper`));
        // params
        editFile.addInterface(`${this.className}Params`).addProperty({name: 'id', type: 'number'});
        // props
        let editProps = editFile.addInterface(`${this.className}Props`);
        editProps.setParentClass(`PageComponentProps<${this.className}Params>`);
        editProps.addProperty({name: 'fetch', type: `FetchById<${model.interfaceName}>`});
        editProps.addProperty({name: 'save', type: 'SubmitEventHandler'});
        editProps.addProperty({name: 'validationErrors', type: 'IValidationError'});
        // state
        let editState = editFile.addInterface(`${this.className}State`);
        editState.setParentClass('PageComponentState');
        editState.addProperty({name: model.instanceName, type: model.interfaceName});
        // class
        let editClass = editFile.addClass(this.className);
        editClass.setParentClass(`PageComponent<${this.className}Props, ${this.className}State>`);
        // fetch
        editClass.addMethod('componentDidMount').setContent(`this.props.fetch(+this.props.match.params.id)
            .then(${model.instanceName} => this.setState({${model.instanceName}}));`);
        // onChange method
        let onChange = editClass.addMethod('onChange');
        onChange.setAsArrowFunction(true);
        onChange.addParameter({name: 'name', type: 'string'});
        onChange.addParameter({name: 'value', type: 'any'});
        onChange.setContent(`this.state.${model.instanceName}[name] = value;
        this.setState({${model.instanceName}: this.state.${model.instanceName}});`);
        // render method
        editClass.addMethod('render').setContent(`let ${model.instanceName} = this.state.${model.instanceName} || {};
        return <div className="page ${model.instanceName}Form-component">
            <h1>Editing ${model.originalClassName} #{this.props.match.params.id}</h1>
            <div className="form-wrapper">
                <FormWrapper name="${model.instanceName}EditForm" onSubmit={this.props.save}>
                    <${formClassName} validationErrors={this.props.validationErrors} ${model.instanceName}={${model.instanceName}}
                               onChange={this.onChange}/>
                    <div className="btn-group">
                        <button className="btn btn-primary" type="submit">Save ${model.originalClassName}</button>
                        <button className="btn" type="button" onClick={this.props.history.goBack}>Cancel</button>
                    </div>
                </FormWrapper>
            </div>
        </div>`);
        return editFile.generate();
    }

    public generate() {
        let code = this.genCrudEditComponent();
        // generate file
        fs.writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }
}