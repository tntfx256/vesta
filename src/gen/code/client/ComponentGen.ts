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
import {camelCase, fcUpper, pascalCase, plural, strRepeat} from "../../../util/StringUtil";
import {genRelativePath, mkdir} from "../../../util/FsUtil";
import {clone, findInFileAndReplace} from "../../../util/Util";
import {ModelGen} from "../ModelGen";
import {FieldType, IModelFields} from "@vesta/core";
import {IFieldMeta} from "../FieldGen";

export interface ComponentGenConfig {
    name: string;
    path: string;
    noParams: boolean;
    stateless: boolean;
    hasStyle: boolean;
    model: string;
    isPage: boolean;
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
        const importPath = genRelativePath(this.path, 'src/client/app/components/BaseComponent');
        let params = this.config.noParams ? '' : `\n\nexport interface ${this.className}Params {\n}`;
        return `import React from "react";
import {BaseComponentProps} from "${importPath}";${params}

export interface ${this.className}Props extends BaseComponentProps${params ? `<${this.className}Params>` : ''} {
}

export const ${this.className} = (props: ${this.className}Props) => {
    return (
        <div className="${cmpName}-component">
            <h2>${this.className} Component</h2>
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
        componentFile.addImport(['React'], 'react', true);
        if (this.config.isPage) {
            componentFile.addImport(['PageComponent', 'PageComponentProps', 'PageComponentState'], genRelativePath(this.path, 'src/client/app/components/PageComponent'));
        } else {
            componentFile.addImport(['Component'], 'react');
            componentFile.addImport(['BaseComponentProps'], genRelativePath(this.path, 'src/client/app/components/BaseComponent'));
        }
        if (this.config.model || this.config.isPage) {
            componentFile.addImport(['Navbar'], genRelativePath(this.path, 'src/client/app/components/general/Navbar'), true);
        }
        if (this.config.model) {
            let modelClassName = this.model.originalClassName;
            componentFile.addImport(['Route', 'Switch'], 'react-router');
            componentFile.addImport(['IValidationError'], genRelativePath(this.path, 'src/client/app/cmn/core/error/ValidationError'));
            componentFile.addImport(['DynamicRouter'], genRelativePath(this.path, 'src/client/app/components/general/DynamicRouter'));
            componentFile.addImport(['IDataTableQueryOption'], genRelativePath(this.path, 'src/client/app/components/general/DataTable'));
            componentFile.addImport(['PageTitle'], genRelativePath(this.path, 'src/client/app/components/general/PageTitle'));
            componentFile.addImport(['Preloader'], genRelativePath(this.path, 'src/client/app/components/general/Preloader'));
            componentFile.addImport(['CrudMenu'], genRelativePath(this.path, 'src/client/app/components/general/CrudMenu'));
            componentFile.addImport(['IAccess'], genRelativePath(this.path, 'src/client/app/service/AuthService'));
            let modelImportStatement = modelClassName == this.className ? `${modelClassName} as ${this.model.className}` : this.model.className;
            componentFile.addImport([`I${modelClassName}`, modelImportStatement], genRelativePath(this.path, this.model.file));
            let instanceName = camelCase(this.className);
            componentFile.addImport([`${modelClassName}Add`], `./${instanceName}/${modelClassName}Add`);
            componentFile.addImport([`${modelClassName}Edit`], `./${instanceName}/${modelClassName}Edit`);
            componentFile.addImport([`${modelClassName}Detail`], `./${instanceName}/${modelClassName}Detail`);
            componentFile.addImport([`${modelClassName}List`], `./${instanceName}/${modelClassName}List`);
        }
        return componentFile;
    }

    private genComponentClass(componentFile: TsFileGen): ClassGen {
        // params interface
        let params = '';
        if (!this.config.noParams) {
            let paramInterface = componentFile.addInterface(`${this.className}Params`);
            params = `<${paramInterface.name}>`;
        }
        // props
        let propsInterface = componentFile.addInterface(`${this.className}Props`);
        propsInterface.setParentClass(this.config.isPage ? `PageComponentProps${params}` : `BaseComponentProps${params}`);
        // state
        let stateInterface = componentFile.addInterface(`${this.className}State`);
        if (this.config.isPage) {
            stateInterface.setParentClass(`PageComponentState`);
        }
        if (this.config.model) {
            stateInterface.addProperty({name: 'showLoader', type: 'boolean'});
            stateInterface.addProperty({name: 'validationErrors', type: 'IValidationError'});
            stateInterface.addProperty({
                name: plural(this.model.instanceName),
                type: `Array<${this.model.interfaceName}>`
            });
            stateInterface.addProperty({
                name: 'queryOption',
                type: `IDataTableQueryOption<${this.model.interfaceName}>`
            });
            if (this.relationalFields) {
                for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                    let meta: IFieldMeta = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                    stateInterface.addProperty({
                        name: `${plural(fieldNames[i])}`,
                        type: `Array<I${meta.relation.model}>`
                    });
                }
            }
        }
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                let metaInfo = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                if (metaInfo.relation && metaInfo.relation.model) {
                    stateInterface.addProperty({
                        name: plural(fieldNames[i]),
                        type: `Array<I${metaInfo.relation.model}>`
                    });
                }
            }
        }
        // component class
        let componentClass = componentFile.addClass(this.className);
        componentClass.setParentClass(`${this.config.isPage ? 'PageComponent' : 'Component'}<${propsInterface.name}, ${stateInterface.name}>`);
        if (this.config.model) {
            componentClass.addProperty({name: 'access', type: 'IAccess', access: 'private'});
        }
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
        let cssClass = this.config.isPage ? `page ${instanceName}-page has-navbar` : `${instanceName}-component`;
        let navbar = this.config.isPage ? `\n\t\t\t\t<Navbar title={this.tr('${instanceName}')}/>` : '';
        (componentClass.addMethod('render')).setContent(`return (
            <div className="${cssClass}">${navbar}
                <h1>${this.className} Component</h1>
            </div>
        )`);
    }

    private addCrudParentComponentMethods(componentFile: TsFileGen, componentClass: ClassGen) {
        let stateName = camelCase(this.className);
        // constructor method
        let extStates = [];
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                let meta: IFieldMeta = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                extStates.push(`${plural(fieldNames[i])}: []`);
            }
        }
        let extStatesCode = extStates.length ? `,\n\t\t\t${extStates.join(',\n\t\t\t')}` : '';
        componentClass.getConstructor().setContent(`super(props);
        this.access = this.auth.getAccessList('${stateName}');
        this.state = {
            showLoader: false,
            validationErrors: null,
            ${plural(this.model.instanceName)}: [],
            queryOption: {page: 1, limit: this.pagination.itemsPerPage}${extStatesCode}
        };`);
        // fetching relation on component did mount
        let extraProps = [];
        let fetchCallers = [];
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                let meta: IFieldMeta = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                fetchCallers.push(`this.fetch${pascalCase(plural(fieldNames[i]))}();`);
                extraProps.push(`${plural(fieldNames[i])}`);
                componentFile.addImport([`I${meta.relation.model}`], genRelativePath(this.path, `src/client/app/cmn/models/${meta.relation.model}`));
            }
            componentClass.addMethod('componentDidMount').setContent(`this.setState({showLoader: true});
        ${fetchCallers.join('\n\t\t')}`);
        }
        // let indent = `${strRepeat('\t', 10)}${strRepeat(' ', 3)}`;
        // let extraPropsCode = `,\n${indent}${extraProps.join(`,\n${indent}`)}`;
        let extraPropsCode = `, ${extraProps.join(', ')}`;
        // indent = `${strRepeat('\t', 9)}${strRepeat(' ', 3)}`;
        // let detailsExtraPropsCode = `,\n${indent}${extraProps.join(`,\n${indent}`)}`;
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
                this.notif.error(this.tr(error.message));
            })`);
        // fetchCount method
        let fetchCountMethod = componentClass.addMethod(`fetchCount`, ClassGen.Access.Private);
        fetchCountMethod.setAsArrowFunction(true);
        fetchCountMethod.addParameter({
            name: 'queryOption',
            type: `IDataTableQueryOption<${this.model.interfaceName}>`
        });
        fetchCountMethod.setContent(`this.api.get<${model.interfaceName}>('${stateName}/count', queryOption)
            .then(response => {
                this.state.queryOption.total = response.total;
                this.setState({queryOption: this.state.queryOption});
            })
            .catch(error => {
                this.state.queryOption.total = 0;
                this.setState({queryOption: this.state.queryOption});
                this.notif.error(this.tr(error.message));
            })`);
        // fetchAll method
        let fetchAllMethod = componentClass.addMethod(`fetchAll`);
        fetchAllMethod.setAsArrowFunction(true);
        fetchAllMethod.addParameter({name: 'queryOption', type: `IDataTableQueryOption<${this.model.interfaceName}>`});
        fetchAllMethod.setContent(`this.setState({showLoader: true, queryOption});
        this.fetchCount(queryOption);
        this.api.get<${model.interfaceName}>('${stateName}', queryOption)
            .then(response => {
                this.setState({showLoader: false, ${plural(this.model.instanceName)}: response.items});
            })
            .catch(error => {
                this.setState({showLoader: false, validationErrors: error.violations});
                this.notif.error(this.tr(error.message));
            })`);
        // save method
        // files
        let fileFields = ModelGen.getFieldsByType(this.config.model, FieldType.File);
        let files = fileFields ? Object.keys(fileFields) : [];
        let resultCode = `this.setState({showLoader: false});
                this.notif.success(this.tr(\`info_\${saveType}_record\`, \`\${response.items[0].id}\`));
                this.fetchAll(this.state.queryOption);
                this.props.history.goBack();`;
        let deleteCode = '';
        let uploadCode = '';
        let uploadResultCode = '';
        if (files.length) {
            deleteCode = `\n\t\tlet hasFile = false;
        let ${model.instanceName}Files: ${model.interfaceName} = {};`;
            for (let i = files.length; i--;) {
                let fieldName = files[0];
                deleteCode += `\n\t\tif (${model.instanceName}.${fieldName}) {
            ${model.instanceName}Files.${fieldName} = ${model.instanceName}.${fieldName};
            delete ${model.instanceName}.${fieldName};
            hasFile = true;
        }`;
            }
            uploadCode = `hasFile ? this.api.upload<${model.interfaceName}>('${model.instanceName}/file', response.items[0].id, ${model.instanceName}Files): response`;
            uploadResultCode = `\n\t\t\t.then(response => {
                ${resultCode}
            })`;
        } else {
            uploadCode = `{
                ${resultCode}
            }`;
        }
        let saveMethod = componentClass.addMethod(`save`);
        saveMethod.setAsArrowFunction(true);
        saveMethod.addParameter({name: 'model', type: model.interfaceName});
        saveMethod.setContent(`let ${model.instanceName} = new ${model.className}(model);
        const saveType = ${model.instanceName}.id ? 'update' : 'add';${deleteCode}
        let validationErrors = ${model.instanceName}.validate();
        if (validationErrors) {
            return this.setState({validationErrors});
        }
        this.setState({showLoader: true, validationErrors: null});
        let data = ${model.instanceName}.getValues<${model.interfaceName}>();
        (model.id ? this.api.put<${model.interfaceName}>('${model.instanceName}', data) : this.api.post<${model.interfaceName}>('${model.instanceName}', data))
            .then(response => ${uploadCode})${uploadResultCode}
            .catch(error => {
                this.setState({showLoader: false, validationErrors: error.violations});
                this.notif.error(this.tr(error.message));
            })`);
        // fetch functions for relations
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                let method = componentClass.addMethod(`fetch${pascalCase(plural(fieldNames[i]))}`);
                let meta: IFieldMeta = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                if (meta.relation && meta.relation.model) {
                    let modelName = meta.relation.model;
                    let instanceName = camelCase(modelName);
                    method.setAsArrowFunction(true);
                    method.setContent(`this.setState({showLoader: true});
        this.api.get<I${modelName}>('${instanceName}')
            .then(response => {
                this.setState({showLoader: false, ${plural(fieldNames[i])}: response.items});
            })
            .catch(error => {
                this.setState({showLoader: false, validationErrors: error.violations});
                this.notif.error(this.tr(error.message));
            })`);
                }
            }
        }
        // render method
        let modelClassName = this.model.originalClassName;
        (componentClass.addMethod('render')).setContent(`let {showLoader, ${plural(model.instanceName)}, queryOption, validationErrors${extraPropsCode}} = this.state;
        return (
            <div className="page ${stateName}-page has-navbar">
                <PageTitle title={this.tr('mdl_${this.className.toLowerCase()}')}/>
                <Navbar title={this.tr('mdl_${this.className.toLowerCase()}')} showBurger={true}/>
                <h1>{this.tr('mdl_${this.className.toLowerCase()}')}</h1>
                <Preloader show={showLoader}/>
                <CrudMenu path="${stateName}" access={this.access}/>
                <div className="crud-wrapper">
                    <DynamicRouter>
                        <Switch>
                            {this.access.add ?
                                <Route path="/${stateName}/add" 
                                       render={this.tz(${modelClassName}Add, {${stateName}: ['add']}, {
                                           save: this.save, validationErrors${extraPropsCode}
                                       })}/> : null}
                            {this.access.edit ? 
                                <Route path="/${stateName}/edit/:id" 
                                       render={this.tz(${modelClassName}Edit, {${stateName}: ['edit']}, {
                                           save: this.save, fetch: this.fetch, validationErrors${extraPropsCode}
                                       })}/> : null}
                            <Route path="/${stateName}/detail/:id" 
                                   render={this.tz(${modelClassName}Detail, {${stateName}: ['read']}, {
                                       fetch: this.fetch
                                   })}/>
                        </Switch>
                    </DynamicRouter>
                    <${modelClassName}List access={this.access} fetch={this.fetchAll} queryOption={queryOption}
                     ${strRepeat(' ', modelClassName.length)}     ${plural(this.model.instanceName)}={${plural(this.model.instanceName)}}/>
                </div>
            </div>
        )`);
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
        writeFileSync(`${path}/_${stateName}.scss`, `.${stateName}-${this.config.isPage ? 'page' : 'component'} {\n\n}`, {encoding: 'utf8'});
        const importStatement = `@import "${relPath}/${stateName}";`;
        let replace = this.config.isPage ? '///<vesta:scssPageComponent/>' : '///<vesta:scssComponent/>';
        findInFileAndReplace('src/client/scss/_common.scss', {[replace]: `${importStatement}\n${replace}`}, code => code.indexOf(importStatement) < 0);
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
            isPage: argParser.has('--page'),
            stateless: argParser.has('--stateless'),
            noParams: argParser.has('--no-params')
        };
        if (!config.name) {
            Log.error("Missing/Invalid component name\nSee 'vesta gen component --help' for more information\n");
            return;
        }
        if (config.model) {
            config.isPage = true;
        }
        // if (config.model && config.noParams) {
        //     Log.error("--model and --partial can not be used together\nSee 'vesta gen component --help' for more information\n");
        //     return;
        // }
        (new ComponentGen(config)).generate();
    }

    static help() {
        Log.write(`
Usage: vesta gen component <NAME> [options...] 

Creating React component 

    NAME        The name of the component
    
Options:
    --stateless Generates a stateless component
    --no-params Create component with no params
    --no-style  Do not generate scss style file
    --page      Adds navbar to component and also change className for page component
    --model     Create CRUD component for specified model
    --path      Where to save component [default: src/client/component/root]

Example:
    vesta gen component test --stateless --no-style --path=general/form
    vesta gen component test --model=User
`);
    }
}