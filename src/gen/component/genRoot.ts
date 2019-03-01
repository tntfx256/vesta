import { writeFileSync } from "fs";
import { kebabCase } from "lodash";
import { genRelativePath } from "../../util/FsUtil";
import { parseModel } from "../../util/Model";
import { IComponentGenConfig } from "../ComponentGen";
import { TsFileGen } from "../core/TSFileGen";
import { Vesta } from "../Vesta";

export function genRoot(config: IComponentGenConfig) {
    const model = parseModel(config.name);
    if (!model) { return; }
    const path = `${Vesta.directories.components}/${config.path}`;
    const file = new TsFileGen(config.name);
    // main method
    const method = file.addMethod(model.className);
    method.isArrow = true;
    method.shouldExport = true;

    const componentFile = genComponentFile();
    writeFileSync(`${path}/${model.className}.tsx`, componentFile.generate());
    generateScss();

    function generateScss() {
        if (!config.hasStyle) { return; }
        const stylePath = `${path}/${model.className}.scss`;
        writeFileSync(stylePath, `.${kebabCase(model.className).toLowerCase()} {}`, { encoding: "utf8" });
    }

    function genComponentFile(): TsFileGen {
        file.addImport(["React"], "react", true);
        file.addImport(["ComponentType"], "react");
        file.addImport(["Culture"], "@vesta/culture");
        file.addImport(["AclAction"], "@vesta/services");
        file.addImport(["Navbar", "PageTitle", "CrudMenu", "IRouteComponentProps"], "@vesta/components");
        file.addImport(["getAclInstance"], genRelativePath(path, `${Vesta.directories.app}/service/Acl`));
        file.addImport(["Go"], genRelativePath(path, `${Vesta.directories.components}/general/Go`));

        for (const crud of [`Add`, `Edit`, `Detail`, `List`]) {
            file.addImport([`${model.className}${crud}`], `./${model.instanceName}/${model.className}${crud}`);
        }

        // params interface
        const params = file.addInterface(`I${model.className}Params`);

        // props
        const props = file.addInterface(`I${model.className}Props`);
        props.setParentClass(`IRouteComponentProps<${params.name}>`);
        method.methodType = `ComponentType<${props.name}>`;

        method.appendContent(`
    const access = getAclInstance().getAccessList("${model.instanceName}");
    const tr = Culture.getDictionary().translate;

    return (
        <div className="page ${kebabCase(model.instanceName).toLowerCase()}-page has-navbar">
            <PageTitle title={tr("mdl_${model.className.toLowerCase()}")} />
            <Navbar title={tr("mdl_${model.className.toLowerCase()}")} />
            <h1>{tr("mdl_${model.className.toLowerCase()}")}</h1>
            <CrudMenu path="${model.instanceName}" access={access} />
            <div className="crud-wrapper">
                <Go path="/${model.instanceName}/add" component={${model.className}Add} permissions={{ ${model.instanceName}: [AclAction.Add] }} />
                <Go path="/${model.instanceName}/edit/:id" component={${model.className}Edit} permissions={{ ${model.instanceName}: [AclAction.Edit] }} />
                <Go path="/${model.instanceName}/detail/:id" component={${model.className}Detail} />
                <${model.className}List />
            </div>
        </div>
    );`);
        return file;
    }
}
