import * as fs from "fs";
import {CrudComponentGenConfig} from "../ComponentGen";
import {TsFileGen} from "../../../core/TSFileGen";
import {genRelativePath, mkdir} from "../../../../util/FsUtil";

export class FormComponentGen {
    private className: string;

    constructor(private config: CrudComponentGenConfig) {
        this.className = `${config.modelConfig.originalClassName}Form`;
        mkdir(config.path);
    }

    private genCrudFormComponent() {
        let model = this.config.modelConfig;
        let path = this.config.path;
        // ts file
        let formFile = new TsFileGen(this.className);
        // imports
        formFile.addImport('React', 'react');
        formFile.addImport('{PageComponentProps}', genRelativePath(path, 'src/client/app/components/PageComponent'));
        formFile.addImport('{IValidationError}', genRelativePath(path, 'src/client/app/medium'));
        formFile.addImport('{ModelValidationMessage, Util}', genRelativePath(path, 'src/client/app/util/Util'));
        formFile.addImport('{ChangeEventHandler}', genRelativePath(path, 'src/client/app/components/general/form/FormWrapper'));
        formFile.addImport(`{${model.interfaceName}}`, genRelativePath(path, `src/client/app/cmn/models/${model.originalClassName}`));
        // params
        formFile.addInterface(`${this.className}Params`);
        // props
        let formProps = formFile.addInterface(`${this.className}Props`);
        formProps.setParentClass(`PageComponentProps<${this.className}Params>`);
        formProps.addProperty({name: model.instanceName, type: model.interfaceName, isOptional: true});
        formProps.addProperty({name: 'onChange', type: 'ChangeEventHandler'});
        formProps.addProperty({name: 'validationErrors', type: 'IValidationError'});
        // stateless component
        formFile.addMixin(`
export const ${model.originalClassName}Form = (props: ${formProps.name}) => {
    const formErrorsMessages: ModelValidationMessage = {};
    let errors = props.validationErrors ? Util.validationMessage(formErrorsMessages, props.validationErrors) : {};
    let ${model.instanceName} = props.${model.instanceName} || {};
    return (
        <div className="${model.instanceName}Form-component">
        </div>
    );
}`, TsFileGen.CodeLocation.AfterClass);
        return formFile.generate();
    }

    public generate() {
        let code = this.genCrudFormComponent();
        // generate file
        fs.writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }
}