import { FieldType, IModelFields, RelationType } from "@vesta/core";
import { existsSync, writeFileSync } from "fs";
import { ArgParser } from "../../../util/ArgParser";
import { genRelativePath, mkdir } from "../../../util/FsUtil";
import { Log } from "../../../util/Log";
import { camelCase, fcUpper, kebabCase, pascalCase, plural } from "../../../util/StringUtil";
import { clone, findInFileAndReplace } from "../../../util/Util";
import { ClassGen } from "../../core/ClassGen";
import { TsFileGen } from "../../core/TSFileGen";
import { Vesta } from "../../file/Vesta";
import { IFieldMeta } from "../FieldGen";
import { ModelGen } from "../ModelGen";
import { AddComponentGen } from "./crud/AddComponentGen";
import { DetailComponentGen } from "./crud/DetailComponentGen";
import { EditComponentGen } from "./crud/EditComponentGen";
import { FormComponentGen } from "./crud/FormComponentGen";
import { ListComponentGen } from "./crud/ListComponentGen";

export interface IComponentGenConfig {
    hasStyle: boolean;
    isPage: boolean;
    model: string;
    name: string;
    noParams: boolean;
    path: string;
    stateless: boolean;
}

export interface ICrudComponentGenConfig extends IComponentGenConfig {
    modelConfig: IModelConfig;
}

export interface IModelConfig {
    className: string;
    file: string;
    instanceName: string;
    interfaceName: string;
    originalClassName: string;
}

export class ComponentGen {

    public static help() {
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
    --path      Where to save component [default: src/component/root]

Example:
    vesta gen component test --stateless --no-style --path=general/form
    vesta gen component test --model=User
`);
    }

    public static init() {
        const argParser = ArgParser.getInstance();
        const config: IComponentGenConfig = {
            hasStyle: !argParser.has("--no-style"),
            isPage: argParser.has("--page"),
            model: argParser.get("--model"),
            name: argParser.get(),
            noParams: argParser.has("--no-params"),
            path: argParser.get("--path", "root"),
            stateless: argParser.has("--stateless"),
        } as IComponentGenConfig;
        if (!config.name) {
            Log.error("Missing/Invalid component name\nSee 'vesta gen component --help' for more information\n");
            return;
        }
        if (config.model) {
            config.isPage = true;
        }
        // if (config.model && config.noParams) {
        //     Log.error("--model and --partial can not be used together\n
        // See 'vesta gen component --help' for more information\n");
        //     return;
        // }
        (new ComponentGen(config)).generate();
    }

    private className: string;
    private model: IModelConfig;
    private path = "src/client/app/components/";
    private relationalFields: IModelFields;

    constructor(private config: IComponentGenConfig) {
        this.path = `${Vesta.getInstance().directories.components}/${config.path}`;
        this.className = fcUpper(config.name);
        mkdir(this.path);
    }

    public generate() {
        if (this.config.model) {
            this.model = this.parseModel();
            if (!this.model) { return; }
            this.relationalFields = ModelGen.getFieldsByType(this.config.model, FieldType.Relation);
        }
        const code = this.config.stateless ? this.genStateless() : this.genStateful();
        writeFileSync(`${this.path}/${this.className}.tsx`, code);
        this.createScss();
        if (this.config.model) {
            const instanceName = camelCase(this.className);
            const crudComponentPath = `${this.path}/${instanceName}`;
            mkdir(crudComponentPath);
            const crudConfig = clone<ICrudComponentGenConfig>(this.config as ICrudComponentGenConfig);
            crudConfig.modelConfig = this.model;
            crudConfig.path = crudComponentPath;
            (new FormComponentGen(crudConfig)).generate();
            (new ListComponentGen(crudConfig)).generate();
            (new DetailComponentGen(crudConfig)).generate();
            (new AddComponentGen(crudConfig)).generate();
            (new EditComponentGen(crudConfig)).generate();
        }
    }

    private addCrudParentComponentMethods(componentFile: TsFileGen, componentClass: ClassGen) {
        const stateName = camelCase(this.className);
        // constructor method
        const extStates = [];
        const modelObject = ModelGen.getModel(this.model.originalClassName);
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                const meta: IFieldMeta = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                if (!meta.form || !meta.relation.showAllOptions) { continue; }
                // do not pluralize field names for many2many relationships
                const field = modelObject.schema.getField(fieldNames[i]);
                if (field.properties.relation.type === RelationType.Many2Many) {
                    extStates.push(`${fieldNames[i]}: []`);
                } else {
                    extStates.push(`${plural(fieldNames[i])}: []`);
                }
            }
        }
        const extStatesCode = extStates.length ? `,\n\t\t\t${extStates.join(",\n\t\t\t")}` : "";
        componentClass.getConstructor().setContent(`super(props);
        this.access = this.auth.getAccessList("${stateName}");
        this.state = { ${plural(this.model.instanceName)}: [], queryOption: { page: 1, limit: 20 }${extStatesCode} };`);
        // fetching relation on component did mount
        const extraProps = [];
        const fetchCallers = [];
        const cmnDir = Vesta.getInstance().directories.cmn;
        if (this.relationalFields) {
            for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                const meta: IFieldMeta = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                if (!meta.form || !meta.relation.showAllOptions) { continue; }
                const field = modelObject.schema.getField(fieldNames[i]);
                const shouldBePlural = field.properties.relation.type !== RelationType.Many2Many;
                fetchCallers.push(`this.fetch${pascalCase(shouldBePlural ? plural(fieldNames[i]) : fieldNames[i])}();`);
                extraProps.push(shouldBePlural ? plural(fieldNames[i]) : fieldNames[i]);
                componentFile.addImport([`I${meta.relation.model}`],
                    genRelativePath(this.path, `${cmnDir}/models/${meta.relation.model}`));
            }
            componentClass.addMethod("componentDidMount").setContent(`this.setState({ showLoader: true });
        ${fetchCallers.join("\n\t\t")}`);
        }
        // let indent = `${strRepeat('\t', 10)}${strRepeat(' ', 3)}`;
        // let extraPropsCode = `,\n${indent}${extraProps.join(`,\n${indent}`)}`;
        const extraPropsCode = extraProps.length ? `, ${extraProps.join(", ")}` : "";
        // indent = `${strRepeat('\t', 9)}${strRepeat(' ', 3)}`;
        // let detailsExtraPropsCode = `,\n${indent}${extraProps.join(`,\n${indent}`)}`;
        const model = this.model;
        // render method
        const modelClassName = this.model.originalClassName;
        (componentClass.addMethod("render")).setContent(`
        const add = this.access.add ?
            <Route path="/${stateName}/add" render={this.tz(${modelClassName}Add, {${stateName}: ["add"]})} /> : null;
        const edit = this.access.edit ?
            <Route path="/${stateName}/edit/:id" render={this.tz(${modelClassName}Edit, {${stateName}: ["edit"]})} /> : null;

        return (
            <div className="page ${kebabCase(stateName).toLowerCase()}-page has-navbar">
                <PageTitle title={this.tr("mdl_${this.className.toLowerCase()}")} />
                <Navbar title={this.tr("mdl_${this.className.toLowerCase()}")} showBurger={true} />
                <h1>{this.tr("mdl_${this.className.toLowerCase()}")}</h1>
                <CrudMenu path="${stateName}" access={this.access} />

                <div className="crud-wrapper">
                    <DynamicRouter>
                        <Switch>
                            {add}
                            {edit}
                            <Route path="/${stateName}/detail/:id" render={this.tz(${modelClassName}Detail, {${stateName}: ["read"]})} />
                        </Switch>
                    </DynamicRouter>
                    <${modelClassName}List access={this.access} />
                </div>
            </div>
        );`);
        writeFileSync(`${this.path}/${this.className}.tsx`, componentFile.generate());
    }

    private addSimpleComponentMethods(componentClass: ClassGen) {
        const instanceName = camelCase(this.className);
        const className = kebabCase(this.className).toLowerCase();
        // constructor method
        componentClass.getConstructor().setContent(`super(props);
        this.state = {};`);
        // render method
        const cssClass = this.config.isPage ? `page ${className}-page has-navbar` : `${className}`;
        const navbar = this.config.isPage ? `\n\t\t\t\t<Navbar title={this.tr("${instanceName.toLowerCase()}")} />` : "";
        (componentClass.addMethod("render")).setContent(`return (
            <div className="${cssClass}">${navbar}
                <h1>${this.className} Component</h1>
            </div>
        );`);
    }

    private createScss() {
        if (!this.config.hasStyle) { return; }
        const relPath = `components/${this.config.path}`;
        const scssDir = Vesta.getInstance().directories.sass;
        const path = `${scssDir}/${relPath}`;
        mkdir(path);
        const className = kebabCase(this.className).toLowerCase();
        writeFileSync(`${path}/_${className}.scss`, `.${className}${this.config.isPage ? "-page" : ""} {\n\n}`, { encoding: "utf8" });
        const importStatement = `@import '${relPath}/${className}';`;
        const replace = this.config.isPage ? "// <vesta:scssPageComponent/>" : "// <vesta:scssComponent/>";
        findInFileAndReplace(`${scssDir}/_common.scss`, { [replace]: `${importStatement}\n${replace}` }, (code) => code.indexOf(importStatement) < 0);
    }

    private genComponentClass(componentFile: TsFileGen): ClassGen {
        // params interface
        let params = "";
        if (!this.config.noParams) {
            const paramInterface = componentFile.addInterface(`I${this.className}Params`);
            params = `<${paramInterface.name}>`;
        }
        // props
        const propsInterface = componentFile.addInterface(`I${this.className}Props`);
        const propsParentClass = this.config.isPage ? `IPageComponentProps${params}` : `IBaseComponentProps`;
        propsInterface.setParentClass(propsParentClass);
        // state
        const stateInterface = componentFile.addInterface(`I${this.className}State`);
        if (this.config.model) {
            stateInterface.addProperty({ name: "showLoader", type: "boolean", isOptional: true });
            stateInterface.addProperty({ name: "validationErrors", type: "IValidationError", isOptional: true });
            stateInterface.addProperty({
                name: plural(this.model.instanceName),
                type: `${this.model.interfaceName}[]`,
            });
            stateInterface.addProperty({
                name: "queryOption",
                type: `IDataTableQueryOption<${this.model.interfaceName}>`,
            });
            if (this.relationalFields) {
                const modelObject = ModelGen.getModel(this.model.originalClassName);
                for (let fieldNames = Object.keys(this.relationalFields), i = 0, il = fieldNames.length; i < il; ++i) {
                    const meta: IFieldMeta = ModelGen.getFieldMeta(this.config.model, fieldNames[i]);
                    if (!meta.form || !meta.relation.showAllOptions) { continue; }
                    const field = modelObject.schema.getField(fieldNames[i]);
                    const isMany2Many = field.properties.relation.type === RelationType.Many2Many;
                    stateInterface.addProperty({
                        name: isMany2Many ? fieldNames[i] : plural(fieldNames[i]),
                        type: `I${meta.relation.model}[]`,
                    });
                }
            }
        }
        // component class
        const componentClass = componentFile.addClass(this.className);
        componentClass.shouldExport(true);
        const parentClass = this.config.isPage ? "PageComponent" : "Component";
        componentClass.setParentClass(`${parentClass}<${propsInterface.name}, ${stateInterface.name}>`);
        if (this.config.model) {
            componentClass.addProperty({ name: "access", type: "IAccess", access: "private" });
        }
        componentClass.setConstructor();
        componentClass.getConstructor().addParameter({ name: "props", type: propsInterface.name });
        if (this.config.model) {
            this.addCrudParentComponentMethods(componentFile, componentClass);
        } else {
            this.addSimpleComponentMethods(componentClass);
        }
        return componentClass;
    }

    private genComponentFile(): TsFileGen {
        const componentFile = new TsFileGen(this.className);
        const appDir = Vesta.getInstance().directories.app;
        componentFile.addImport(["React"], "react", true);
        if (this.config.isPage) {
            componentFile.addImport(["PageComponent", "IPageComponentProps"],
                genRelativePath(this.path, `${appDir}/components/PageComponent`));
        } else {
            componentFile.addImport(["Component"], "react");
            componentFile.addImport(["IBaseComponentProps"],
                genRelativePath(this.path, `${appDir}/components/BaseComponent`));
        }
        if (this.config.model || this.config.isPage) {
            componentFile.addImport(["Navbar"],
                genRelativePath(this.path, `${appDir}/components/general/Navbar`), true);
        }
        if (this.config.model) {
            const modelClassName = this.model.originalClassName;
            componentFile.addImport(["Route", "Switch"], "react-router");
            componentFile.addImport(["DynamicRouter", "IValidationError"],
                genRelativePath(this.path, `${appDir}/medium`));
            componentFile.addImport(["IDataTableQueryOption"],
                genRelativePath(this.path, `${appDir}/components/general/DataTable`));
            componentFile.addImport(["PageTitle"],
                genRelativePath(this.path, `${appDir}/components/general/PageTitle`));
            componentFile.addImport(["Preloader"],
                genRelativePath(this.path, `${appDir}/components/general/Preloader`));
            componentFile.addImport(["CrudMenu"],
                genRelativePath(this.path, `${appDir}/components/general/CrudMenu`));
            componentFile.addImport(["IAccess"],
                genRelativePath(this.path, `${appDir}/service/AuthService`));
            const modelImportStatement = modelClassName === this.className ?
                `${modelClassName} as ${this.model.className}` : this.model.className;
            componentFile.addImport([`I${modelClassName}`, modelImportStatement],
                genRelativePath(this.path, this.model.file));
            const instanceName = camelCase(this.className);
            componentFile.addImport([`${modelClassName}Add`], `./${instanceName}/${modelClassName}Add`);
            componentFile.addImport([`${modelClassName}Edit`], `./${instanceName}/${modelClassName}Edit`);
            componentFile.addImport([`${modelClassName}Detail`], `./${instanceName}/${modelClassName}Detail`);
            componentFile.addImport([`${modelClassName}List`], `./${instanceName}/${modelClassName}List`);
        }
        return componentFile;
    }

    private genStateful() {
        const componentFile = this.genComponentFile();
        this.genComponentClass(componentFile);
        return componentFile.generate();
    }

    private genStateless() {
        const cmpName = camelCase(this.className);
        const className = kebabCase(cmpName).toLowerCase();
        const appDir = Vesta.getInstance().directories.app;
        const importPath = genRelativePath(this.path, `${appDir}/components/BaseComponent`);
        const params = this.config.noParams ? "" : `\n\ninterface I${this.className}Params {\n}`;
        return `import React from "react";
import { IBaseComponentProps } from "${importPath}";${params}

interface I${this.className}Props extends IBaseComponentProps {
}

export const ${this.className} = (props: I${this.className}Props) => {
    return (
        <div className="${className}">
            <h2>${this.className} Component</h2>
        </div>
    );
};\n`;
    }

    private parseModel(): IModelConfig {
        const cmnDir = Vesta.getInstance().directories.cmn;
        const modelFilePath = `${cmnDir}/models/${this.config.model}.ts`;
        if (!existsSync(modelFilePath)) {
            Log.error(`Specified model was not found: '${modelFilePath}'`);
            return null;
        }
        // todo: require model file
        const modelClassName = fcUpper(this.config.model.match(/([^\/]+)$/)[1]);
        return {
            className: modelClassName === this.className ? `${modelClassName}Model` : modelClassName,
            file: modelFilePath,
            instanceName: camelCase(modelClassName),
            interfaceName: `I${modelClassName}`,
            originalClassName: modelClassName,
        };
    }
}
