import * as fs from "fs";
import {CrudComponentGenConfig} from "../ComponentGen";
import {TsFileGen} from "../../../core/TSFileGen";
import {camelCase} from "../../../../util/StringUtil";
import {genRelativePath, mkdir} from "../../../../util/FsUtil";

export class AddComponentGen {
    private className: string;

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
        addFile.addImport('React', 'react', TsFileGen.ImportType.Module);
        addFile.addImport('{IValidationError}', '@vesta/core-es5', TsFileGen.ImportType.Module);
        addFile.addImport('{PageComponent, PageComponentProps, PageComponentState}', genRelativePath(path, 'src/client/app/components/PageComponent'), TsFileGen.ImportType.Module);
        addFile.addImport(`{${formClassName}}`, `./${formClassName}`, TsFileGen.ImportType.Module);
        addFile.addImport(`{ChangeEventHandler, FormWrapper, SubmitEventHandler}`, genRelativePath(path, `src/client/app/components/general/form/FormWrapper`), TsFileGen.ImportType.Module);
        // params
        addFile.addInterface(`${this.className}Params`);
        let addProps = addFile.addInterface(`${this.className}Props`);
        addProps.setParentClass(`PageComponentProps<${this.className}Params>`);
        addProps.addProperty({name: 'save', type: 'SubmitEventHandler'});
        addProps.addProperty({name: 'onChange', type: 'ChangeEventHandler'});
        addProps.addProperty({name: 'validationErrors', type: 'IValidationError'});
        addFile.addInterface(`${this.className}State`).setParentClass('PageComponentState');
        // class
        let addClass = addFile.addClass(this.className);
        addClass.setParentClass(`PageComponent<${this.className}Props, ${this.className}State>`);
        // render method
        addClass.addMethod('render').setContent(`return (
            <div className="page ${model.instanceName}Form-component">
                <h1>Add new ${model.originalClassName}</h1>
                <div className="form-wrapper">
                    <FormWrapper name="${model.instanceName}AddForm" onSubmit={this.props.save}>
                        <${formClassName} onChange={this.props.onChange} validationErrors={this.props.validationErrors}/>
                        <div className="btn-group">
                            <button className="btn btn-primary" type="submit">Add New ${model.originalClassName}</button>
                            <button className="btn" type="button" onClick={this.props.history.goBack}>Cancel</button>
                        </div>
                    </FormWrapper>
                </div>
            </div>
        );`);
        return addFile.generate();
    }

    public generate() {
        let code = this.genCrudAddComponent();
        // generate file
        fs.writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }
}