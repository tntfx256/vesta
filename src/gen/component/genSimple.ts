import { writeFileSync } from "fs";
import { camelCase, upperFirst } from "lodash";
import { IComponentGenConfig } from "../ComponentGen";
import { TsFileGen } from "../core/TSFileGen";
import { Vesta } from "../Vesta";

export function genSimple(config: IComponentGenConfig) {
    const path = `${Vesta.directories.components}/${config.path}`;

    const className = upperFirst(camelCase(config.name));

    const componentFile = new TsFileGen(className);
    componentFile.addImport(["React"], "react", true);
    componentFile.addImport(["ComponentType"], "react");
    componentFile.addImport(["IComponentProps"], "@vesta/components");
    // props
    const propsInterface = componentFile.addInterface(`I${className}Props`);
    propsInterface.setParentClass("IComponentProps");
    // component class
    componentFile.addMixin(`
export const ${className}: ComponentType<I${className}Props> = (props: I${className}Props) => {

    return (
        <h1>${className} Component</h1>
    );
}`, TsFileGen.CodeLocation.AfterInterface);

    writeFileSync(`${path}/${className}.tsx`, componentFile.generate());
}
