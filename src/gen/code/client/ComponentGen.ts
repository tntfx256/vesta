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
import {camelCase, fcUpper, pascalCase, plural} from "../../../util/StringUtil";
import {genRelativePath, mkdir} from "../../../util/FsUtil";
import {clone, findInFileAndReplace} from "../../../util/Util";
import {ModelGen} from "../ModelGen";
import {FieldType, IModelFields} from "@vesta/core";
import {IFieldMeta} from "../FieldGen";

export interface ComponentGenConfig {
    name: string;
    path: string;
    isPartial: boolean;
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
    private relationalFields: IModelFields;

    constructor(private config: ComponentGenConfig) {
        this.path += config.path;
        this.className = fcUpper(config.name);
        mkdir(this.path);
    }

    private genStateless() {
        let cmpName = camelCase(this.className);
        const importPath = genRelativePath(this.path, 'src/client/app/components/PageComponent');
        let importStatement = this.config.isPartial ? '' : `
import {PageComponentProps} from "${importPath}";

export interface ${this.className}Params {
}`;
        let extendsStatement = this.config.isPartial ? '' : `extends PageComponentProps<${this.className}Params> `;
        return `import * as React from "react";${importStatement}

export interface ${this.className}Props ${extendsStatement}{
}

export const ${this.className} = (props: ${this.className}Props) => {
    return (
        <div className="${cmpName}-component">
            <h2>${this.className} Component</h2>
        </div>
    )
};`;
    }

    private genStatefulPartial() {
        let cmpName = camelCase(this.className);
        return `import React from "react";

export interface ${this.className}Props {
}

export interface ${this.className}State {
}

export class ${this.className} extends React.Component<${this.className}Props, ${this.className}State> {

    constructor(props: ${this.className}Props) {
        super(props);
        this.state = {};
    }

    public render() {
        return (
            <div className="page ${cmpName}-component">
                <h2>${this.className} Component</h2>
            </div>
        );
    }
}`;
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
        componentFile.addImport('React', 'react');
        componentFile.addImport('{PageComponent, PageComponentProps, PageComponentState}', genRelativePath(this.path, 'src/client/app/components/PageComponent'));
        if (this.config.model) {
            let modelClassName = this.model.originalClassName;
            componentFile.addImport('{Route, Switch}', 'react-router');
            componentFile.addImport('{IValidationError}', genRelativePath(this.path, 'src/client/app/medium'));
            componentFile.addImport('{DynamicRouter}', genRelativePath(this.path, 'src/client/app/medium'));
            componentFile.addImport('{PageTitle}', genRelativePath(this.path, 'src/client/app/components/general/PageTitle'));
            componentFile.addImport('{Preloader}', genRelativePath(this.path, 'src/client/app/components/general/Preloader'));
            componentFile.addImport('{CrudMenu}', genRelativePath(this.path, 'src/client/app/components/general/CrudMenu'));
            let modelImportStatement = modelClassName == this.className ? `${modelClassName} as ${this.model.className}` : this.model.className;
            componentFile.addImport(`{I${modelClassName}, ${modelImportStatement}}`, genRelativePath(this.path, this.model.file));
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
            stateInterface.addProperty({name: 'showLoader', type: 'boolean'});
            stateInterface.addProperty({name: 'validationErrors', type: 'IValidationError'});
        }
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                let metaInfo = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                stateInterface.addProperty({name: plural(fieldNames[i]), type: `Array<I${metaInfo.relation.model}>`});
            }
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
        let extStates = [];
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                extStates.push(`${plural(fieldNames[i])}: []`);
            }
        }
        let extStatesCode = extStates.length ? `, ${extStates.join(', ')}` : '';
        componentClass.getConstructor().setContent(`super(props);
        this.state = {validationErrors: null, showLoader: false${extStatesCode}};`);
        // fetching relation on component did mount
        let extraProps = [];
        let fetchCallers = [];
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                fetchCallers.push(`this.fetch${pascalCase(plural(fieldNames[i]))}();`);
                extraProps.push(`${fieldNames[i]}: this.state.${plural(fieldNames[i])}`);
                componentFile.addImport(`{I${pascalCase(fieldNames[i])}}`, genRelativePath(this.path, `src/client/app/cmn/models/${pascalCase(fieldNames[i])}`));
            }
            componentClass.addMethod('componentDidMount').setContent(`this.setState({showLoader: true});
        ${fetchCallers.join(';\n\t\t')}`);
        }
        let extraPropsCode = `,\n\t\t\t\t\t\t\t${extraProps.join('\n\t\t\t\t\t\t\t')}`;
        // fetch method
        let fetchMethod = componentClass.addMethod(`fetch`);
        fetchMethod.setAsArrowFunction(true);
        fetchMethod.addParameter({name: 'id', type: 'number'});
        let model = this.model;
        fetchMethod.setContent(`this.setState({showLoader: true});
        return this.api.get<${model.interfaceName}>(\`${stateName}/\${id}\`)
            .then(response => {
                this.setState({showLoader: false});
                return response.items[0];
            })
            .catch(error => {
                this.setState({showLoader: false});
                this.notif.error(error.message);
            })`);
        // fetchAll method
        let fetchAllMethod = componentClass.addMethod(`fetchAll`);
        fetchAllMethod.setAsArrowFunction(true);
        fetchAllMethod.setContent(`this.setState({showLoader: true});
        return this.api.get<${model.interfaceName}>('${stateName}')
            .then(response => {
                this.setState({showLoader: false});
                return response.items;
            })
            .catch(error => {
                this.setState({showLoader: false});
                this.notif.error(error.message);
            })`);
        // save method
        let saveMethod = componentClass.addMethod(`save`);
        saveMethod.setAsArrowFunction(true);
        saveMethod.addParameter({name: 'model', type: model.interfaceName});
        saveMethod.setContent(`let ${model.instanceName} = new ${model.className}(model);
        const saveType = ${model.instanceName}.id ? 'update' : 'add';
        let validationResult = ${model.instanceName}.validate();
        if (validationResult) {
            return this.setState({validationErrors: validationResult});
        }
        this.setState({showLoader: true});
        let data = ${model.instanceName}.getValues<${model.interfaceName}>();
        (model.id ? this.api.put<${model.interfaceName}>('${model.instanceName}', data) : this.api.post<${model.interfaceName}>('${model.instanceName}', data))
            .then(response => {
                this.setState({showLoader: false});
                this.notif.success(this.tr.translate(\`info_\${saveType}_record\`, \`\${response.items[0].id}\`));
                this.props.history.goBack();
            })
            .catch(error => {
                this.setState({showLoader: false, validationErrors: error.validation});
                this.notif.error(error.message);
            });`);
        // fetch functions for relations
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                let method = componentClass.addMethod(`fetch${pascalCase(plural(fieldNames[i]))}`);
                let meta: IFieldMeta = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                let modelName = meta.relation.model;
                let instanceName = camelCase(modelName);
                method.setAsArrowFunction(true);
                method.setContent(`this.setState({showLoader: true});
        this.api.get<I${this.className}>('${instanceName}')
            .then(response => {
                this.setState({showLoader: false, ${plural(instanceName)}: response.items});
            })
            .catch(error => {
                this.setState({showLoader: false});
                this.notif.error(error.message);
            })`);
            }
        }
        // render method
        let modelClassName = this.model.originalClassName;
        (componentClass.addMethod('render')).setContent(`const tr = this.tr.translate;
        return (
            <div className="page ${stateName}-component">
                <PageTitle title={tr('mdl_${this.className.toLowerCase()}')}/>
                <h1>{tr('mdl_${this.className.toLowerCase()}')}</h1>
                <Preloader options={{show: this.state.showLoader}}/>
                <CrudMenu path="${stateName}"/>
                <DynamicRouter>
                    <Switch>
                        <Route path="/${stateName}/add" render={this.tz.willTransitionTo(${modelClassName}Add, {${stateName}: ['add']},{
                            save: this.save,
                            validationErrors: this.state.validationErrors${extraPropsCode}
                        })}/>
                        <Route path="/${stateName}/edit/:id" render={this.tz.willTransitionTo(${modelClassName}Edit, {${stateName}: ['edit']}, {
                            save: this.save,
                            fetch: this.fetch,
                            validationErrors: this.state.validationErrors${extraPropsCode}
                        })}/>
                        <Route path="/${stateName}/detail/:id" render={this.tz.willTransitionTo(${modelClassName}Detail, {${stateName}: ['read']}, {
                            fetch: this.fetch${extraPropsCode}
                        })}/>
                        <Route render={this.tz.willTransitionTo(${modelClassName}List, {${stateName}: ['read']}, {
                            fetch: this.fetchAll
                        })}/>
                    </Switch>
                </DynamicRouter>
            </div>);`);
        writeFileSync(`${this.path}/${this.className}.tsx`, componentFile.generate());
    }

    private genStateful() {
        if (this.config.isPartial) return this.genStatefulPartial();
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
            this.relationalFields = ModelGen.getFieldsByType(this.config.model, FieldType.Relation);
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

    static init() {
        const argParser = ArgParser.getInstance();
        let config: ComponentGenConfig = <ComponentGenConfig>{
            name: argParser.get(),
            path: argParser.get('--path', 'root'),
            model: argParser.get('--model'),
            hasStyle: !argParser.has('--no-style'),
            stateless: argParser.has('--stateless'),
            isPartial: argParser.has('--partial')
        };
        if (!config.name) {
            Log.error("Missing/Invalid component name\nSee 'vesta gen component --help' for more information\n");
            return;
        }
        if (config.model && config.isPartial) {
            Log.error("--model and --partial can not be used together\nSee 'vesta gen component --help' for more information\n");
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
    --partial   Partial component
    --no-style  Do not generate scss style file
    --model     Create CRUD component for specified model

Example:
    vesta gen component test --stateless --no-style --path=general/form
    vesta gen component test --model=User
`);
    }
}