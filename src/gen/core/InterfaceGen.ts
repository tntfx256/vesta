import { MethodGen } from "./MethodGen";
import { IMethodProperties, IStructureProperty, StructureGen } from "./StructureGen";

export class InterfaceGen extends StructureGen {

    constructor(name: string) {
        super(name);
    }

    public addMethod(config: IMethodProperties): MethodGen {
        const method = super.addMethod(config);
        method.isInterface = true;
        return method;
    }

    public generate(): string {
        let code = this.shouldBeExported ? "export " : "";
        code += `interface ${this.name}`;
        if (this.parentClass) { code += " extends " + this.parentClass; }
        if (this.implementations.length) {
            code += " implements " + this.implementations.join(", ");
        }
        code += " {\n";
        if (this.properties.length) { code += `    ${this.getPropertiesCode()}\n`; }
        for (let i = 0, il = this.methods.length; i < il; ++i) {
            code += this.methods[i].generate();
            code += "\n";
        }
        code += "}";
        return code;
    }

    private getPropertiesCode(): string {
        const codes = [];
        const sortedProperties = [].concat(this.properties);
        sortedProperties.sort((a: IStructureProperty, b: IStructureProperty) => a.name > b.name ? 1 : -1);
        for (let i = 0, il = sortedProperties.length; i < il; ++i) {
            let code = sortedProperties[i].name;
            if (sortedProperties[i].isOptional) { code += "?"; }
            if (sortedProperties[i].type) { code += `: ${sortedProperties[i].type}`; }
            code += ";";
            codes.push(code);
        }
        return codes.join("\n    ");
    }
}
