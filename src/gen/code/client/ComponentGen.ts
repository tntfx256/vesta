import * as fs from "fs";
import {writeFileSync} from "fs";
import {ArgParser} from "../../../util/ArgParser";
import {Log} from "../../../util/Log";
import {TsFileGen} from "../../core/TSFileGen";
import {ClassGen} from "../../core/ClassGen";
import {FormComponentGen} from "./crud/FormComponentGen";
import {ListComponentGen} from "./crud/ListComponentGen";
import {DetailComponentGen} from "./crud/DetailComponentGen";
import {AddComponentGen} from "./crud/AddComponentGen";
import {EditComponentGen} from "./crud/EditComponentGen";
import {camelCase, fcUpper} from "../../../util/StringUtil";
import {genRelativePath, mkdir} from "../../../util/FsUtil";
import {clone, findInFileAndReplace} from "../../../util/Util";

export interface ComponentGenConfig {
    name: string;
    path: string;
    stateless: boolean;
    hasStyle: boolean;
    model: string;
}

export interface CrudComponentGenConfig extends ComponentGenConfig {
    modelConfig: ModelConfig;
}

export interface ModelConfig {
    file: string;
    originalClassName: string;
    className: string;
    interfaceName: string;
    instanceName: string;
}

export class ComponentGen {
    private className: string;
    private model: ModelConfig;
    private path = 'src/client/app/components/';

    constructor(private config: ComponentGenConfig) {
        this.path += config.path;
        this.className = fcUpper(config.name);
        mkdir(this.path);
    }

    private genStateless() {
        let cmpName = camelCase(this.className);
        const importPath = genRelativePath(this.path, 'src/client/app/components/PageComponent');
        return `import * as React from "react";
import {PageComponentProps} from "${importPath}";

export interface ${this.className}Params {
}

export interface ${this.className}Props extends PageComponentProps<${this.className}Params> {
}

export const ${this.className} = (props: ${this.className}Props) => {
    return (
        <div className="${cmpName}-component">
            <h1>${this.className} Component</h1>
        </div>
    )

};`;
    }

    private parseModel(): ModelConfig {
        let modelFilePath = `src/client/app/cmn/models/${this.config.model}.ts`;
        if (!fs.existsSync(modelFilePath)) {
            Log.error(`Specified model was not found: '${modelFilePath}'`);
            return null;
        }
        // todo: require model file

        let modelClassName = fcUpper(this.config.model.match(/([^\/]+)$/)[1]);
        return {
            file: modelFilePath,
            originalClassName: modelClassName,
            className: modelClassName == this.className ? `${modelClassName}Model` : modelClassName,
            interfaceName: `I${modelClassName}`,
            instanceName: camelCase(modelClassName)
        };
    }

    private genComponentFile(): TsFileGen {
        let componentFile = new TsFileGen(this.className);
        componentFile.addImport(this.config.model ? 'React' : 'React', 'react');
        componentFile.addImport('{PageComponent, PageComponentProps, PageComponentState}', genRelativePath(this.path, 'src/client/app/components/PageComponent'));
        if (this.config.model) {
            let modelClassName = this.model.originalClassName;
            componentFile.addImport('{Route, Switch}', 'react-router');
            componentFile.addImport('{IQueryResult, IUpsertResult, IValidationError}', genRelativePath(this.path, 'src/client/app/medium'));
            componentFile.addImport('{DynamicRouter}', genRelativePath(this.path, 'src/client/app/medium'));
            componentFile.addImport('{PageTitle}', genRelativePath(this.path, 'src/client/app/components/general/PageTitle'));
            componentFile.addImport('{Preloader}', genRelativePath(this.path, 'src/client/app/components/general/Preloader'));
            componentFile.addImport('{CrudMenu}', genRelativePath(this.path, 'src/client/app/components/general/CrudMenu'));
            let modelImportStatement = modelClassName == this.className ? `${modelClassName} as ${this.model.className}` : this.model.className;
            componentFile.addImport(`{I${modelClassName}, ${modelImportStatement}}`, genRelativePath(this.path, this.model.file));
            componentFile.addImport('{Util}', genRelativePath(this.path, 'src/client/app/util/Util'));
            let instanceName = camelCase(this.className);
            componentFile.addImport(`{${modelClassName}Add}`, `./${instanceName}/${modelClassName}Add`);
            componentFile.addImport(`{${modelClassName}Edit}`, `./${instanceName}/${modelClassName}Edit`);
            componentFile.addImport(`{${modelClassName}Detail}`, `./${instanceName}/${modelClassName}Detail`);
            componentFile.addImport(`{${modelClassName}List}`, `./${instanceName}/${modelClassName}List`);
        }
        return componentFile;
    }

    private genComponentClass(componentFile: TsFileGen): ClassGen {
        // params interface
        let paramInterface = componentFile.addInterface(`${this.className}Params`);
        let propsInterface = componentFile.addInterface(`${this.className}Props`);
        propsInterface.setParentClass(`PageComponentProps<${paramInterface.name}>`);
        let stateInterface = componentFile.addInterface(`${this.className}State`);
        stateInterface.setParentClass(`PageComponentState`);
        if (this.config.model) {
            stateInterface.addProperty({name: this.model.instanceName, type: this.model.interfaceName});
            stateInterface.addProperty({name: 'showLoader', type: 'boolean'});
            stateInterface.addProperty({name: 'validationErrors', type: 'IValidationError'});
        }
        // component class
        let componentClass = componentFile.addClass(this.className);
        componentClass.setParentClass(`PageComponent<${propsInterface.name}, ${stateInterface.name}>`);
        componentClass.setConstructor();
        componentClass.getConstructor().addParameter({name: 'props', type: propsInterface.name});
        if (this.config.model) {
            this.addCrudParentComponentMethods(componentFile, componentClass);
        } else {
            this.addSimpleComponentMethods(componentClass);
        }
        return componentClass;
    }

    private addSimpleComponentMethods(componentClass: ClassGen) {
        const instanceName = camelCase(this.className);
        // constructor method
        componentClass.getConstructor().setContent(`super(props);
        this.state = {};`);
        // render method
        (componentClass.addMethod('render')).setContent(`return (
            <div className="page ${instanceName}-component">
                <h1>${this.className} Component</h1>
            </div>
        );`);
    }

    private addCrudParentComponentMethods(componentFile: TsFileGen, componentClass: ClassGen) {
        let stateName = camelCase(this.className);
        // constructor method
        componentClass.getConstructor().setContent(`super(props);
        this.state = {validationErrors: null, showLoader: false, ${this.model.instanceName}: {}};`);
        // fetch method
        let fetchMethod = componentClass.addMethod(`fetch`);
        fetchMethod.setAsArrowFunction(true);
        fetchMethod.addParameter({name: 'id', type: 'number'});
        let model = this.model;
        fetchMethod.setContent(`this.setState({showLoader: true});
        return this.api.get<IQueryResult<${model.interfaceName}>>(\`${stateName}/\${id}\`)
            .then(response => {
                this.setState({showLoader: false, ${this.model.instanceName}: response.items[0]});
                return response.items[0];
            })
            .catch(error => {
                this.notification.error(error.message);
                this.setState({showLoader: false});
            })`);
        // fetchAll method
        let fetchAllMethod = componentClass.addMethod(`fetchAll`);
        fetchAllMethod.setAsArrowFunction(true);
        fetchAllMethod.setContent(`this.setState({showLoader: true});
        return this.api.get<IQueryResult<${model.interfaceName}>>('${stateName}')
            .then(response => {
                this.setState({showLoader: false});
                return response.items;
            })
            .catch(error => {
                this.notification.error(error.message);
                this.setState({showLoader: false});
            })`);
        // save method
        let saveMethod = componentClass.addMethod(`save`);
        saveMethod.addParameter({name: 'isUpdate', type: 'boolean', isOptional: true});
        saveMethod.setAsArrowFunction(true);
        saveMethod.setContent(`let ${model.instanceName} = new ${model.className}(this.state.${model.instanceName});
        let validationResult = ${model.instanceName}.validate();
        if (validationResult) {
            return this.setState({validationErrors: validationResult});
        }
        this.setState({showLoader: true});
        this.api.post<IUpsertResult<${model.interfaceName}>>('${model.instanceName}', JSON.stringify(${model.instanceName}.getValues<${model.interfaceName}>()))
            .then(response => {
                this.notification.success(\`Record #\${response.items[0].id} has been added successfully\`);
                this.props.history.goBack();
                this.setState({showLoader: false});
            })
            .catch(error => {
                this.notification.error(error.message);
                this.setState({validationErrors: error.validation, showLoader: false});
            });`);
        // onChange method
        let onChange = componentClass.addMethod('onChange');
        onChange.setAsArrowFunction(true);
        onChange.addParameter({name: 'name', type: 'string'});
        onChange.addParameter({name: 'value', type: 'any'});
        onChange.setContent(`let ${model.instanceName} = Util.shallowClone(this.state.${model.instanceName});
        ${model.instanceName}[name] = value;
        this.setState({${model.instanceName}});`);
        // render method
        let modelClassName = this.model.originalClassName;
        (componentClass.addMethod('render')).setContent(`const ${model.instanceName}Id = this.state.${model.instanceName} ? this.state.${model.instanceName}.id : 0;
        return (
            <div className="page ${stateName}-component">
                <PageTitle title="${this.className}"/>
                <h1>${this.className}</h1>
                <Preloader options={{show: this.state.showLoader}}/>
                <CrudMenu path="${stateName}" id={${model.instanceName}Id}/>
                <DynamicRouter>
                    <Switch>
                        <Route path="/${stateName}/add" render={this.tz.willTransitionTo(${modelClassName}Add, {${stateName}: ['add']},{
                            ${model.instanceName}: this.state.${model.instanceName},
                            save: this.save,
                            onChange: this.onChange,
                            validationErrors: this.state.validationErrors
                        })}/>
                        <Route path="/${stateName}/edit/:id" render={this.tz.willTransitionTo(${modelClassName}Edit, {${stateName}: ['edit']}, {
                            ${model.instanceName}: this.state.${model.instanceName},
                            save: this.save,
                            fetch: this.fetch,
                            onChange: this.onChange,
                            validationErrors: this.state.validationErrors
                        })}/>
                        <Route path="/${stateName}/detail/:id" render={this.tz.willTransitionTo(${modelClassName}Detail, {${stateName}: ['read']}, {
                            ${model.instanceName}: this.state.${model.instanceName},
                            fetch: this.fetch
                        })}/>
                        <Route render={this.tz.willTransitionTo(${modelClassName}List, {${stateName}: ['read']}, {fetch: this.fetchAll})}/>
                    </Switch>
                </DynamicRouter>
            </div>
        );`);
        writeFileSync(`${this.path}/${this.className}.tsx`, componentFile.generate());
    }

    private genStateful() {
        let componentFile = this.genComponentFile();
        this.genComponentClass(componentFile);
        return componentFile.generate();
    }

    private createScss() {
        if (!this.config.hasStyle) return;
        let relPath = `components/${this.config.path}`;
        let path = `src/client/scss/${relPath}`;
        mkdir(path);
        let stateName = camelCase(this.className);
        writeFileSync(`${path}/_${stateName}.scss`, `.${stateName}-component {\n\n}`, {encoding: 'utf8'});
        const importStatement = `@import "${relPath}/${stateName}";`;
        findInFileAndReplace('src/client/scss/_common.scss', {'///<vesta:scssComponent/>': `${importStatement}\n///<vesta:scssComponent/>`}, code => code.indexOf(importStatement) < 0);
    }

    public generate() {
        if (this.config.model) {
            this.model = this.parseModel();
            if (!this.model) return;
        }
        let code = this.config.stateless ? this.genStateless() : this.genStateful();
        writeFileSync(`${this.path}/${this.className}.tsx`, code);
        this.createScss();
        if (this.config.model) {
            const instanceName = camelCase(this.className);
            let crudComponentPath = `${this.path}/${instanceName}`;
            mkdir(crudComponentPath);
            let crudConfig = clone<CrudComponentGenConfig>(<CrudComponentGenConfig>this.config);
            crudConfig.modelConfig = this.model;
            crudConfig.path = crudComponentPath;
            (new FormComponentGen(crudConfig)).generate();
            (new ListComponentGen(crudConfig)).generate();
            (new DetailComponentGen(crudConfig)).generate();
            (new AddComponentGen(crudConfig)).generate();
            (new EditComponentGen(crudConfig)).generate();
        }
    }

    static init(arg: ArgParser) {
        let config: ComponentGenConfig = <ComponentGenConfig>{
            name: arg.get(),
            path: arg.get('--path', 'root'),
            model: arg.get('--model'),
            hasStyle: !arg.has('--no-style'),
            stateless: arg.has('--stateless')
        };
        if (!config.name) {
            Log.error("Missing/Invalid component name\nSee 'vesta gen component --help' for more information");
            return;
        }
        (new ComponentGen(config)).generate();
    }

    static help() {
        Log.write(`
Usage: vesta gen component <NAME> [options...] 

Creating React component 

    NAME        The name of the component
    
Options:
    --stateless Generates a stateless component
    --path      Parent hierarchy
    --no-style  Do not generate scss style file
    --model     Create CRUD component for specified model

Example:
    vesta gen component test --stateless --no-style --path=general/form
    vesta gen component test --model=User
`);
    }
}