import {MethodGen} from "./MethodGen";
import {AbstractStructureGen} from "./AbstractStructureGen";

export class InterfaceGen extends AbstractStructureGen {

    constructor(name: string) {
        super(name);
    }

    public addMethod(name: string): MethodGen {
        let method = super.addMethod(name);
        method.isInterfaceMethod(true);
        return method;
    }

    private getPropertiesCode(): string {
        let codes = [];
        for (let i = 0, il = this.properties.length; i < il; ++i) {
            let code = this.properties[i].name;
            if (this.properties[i].isOptional) code += '?';
            if (this.properties[i].type) code += `: ${this.properties[i].type}`;
            code += ';';
            codes.push(code);
        }
        return codes.join('\n    ');
    }

    public generate(): string {
        let code = this.shouldBeExported ? 'export ' : '';
        code += `interface ${this.name}`;
        if (this.parentClass) code += ' extends ' + this.parentClass;
        if (this.implementations.length) {
            code += ' implements ' + this.implementations.join(', ');
        }
        code += ' {\n';
        if (this.properties.length) code += `    ${this.getPropertiesCode()}\n`;
        for (let i = 0, il = this.methods.length; i < il; ++i) {
            code += this.methods[i].generate();
            code += '\n';
        }
        code += '}';
        return code;
    }
}
