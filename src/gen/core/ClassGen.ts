import { AbstractStructureGen } from "./AbstractStructureGen";
import { MethodGen } from "./MethodGen";
import { IMixin } from "./TSFileGen";

export interface IMetodProperties {
    access?: string;
    isAbstract?: boolean;
    isArrow?: boolean;
    isAsync?: boolean;
    isStatic?: boolean;
    name: string;
}

export class ClassGen extends AbstractStructureGen {
    public static Access = {
        Private: "private",
        Protected: "protected",
        Public: "public",
    };
    private mixins: Array<IMixin> = [];

    constructor(public name: string, public isAbstract: boolean = false) {
        super(name);
    }

    public addMethod(name: string, access: string = ClassGen.Access.Public, isStatic: boolean = false, isAbstract: boolean = false, isAsync: boolean = false): MethodGen {
        const method = super.addMethod(name);
        method.setAccessType(access);
        method.setAsStatic(isStatic);
        method.setAsAbstract(isAbstract);
        method.setAsAsync(isAsync);
        return method;
    }

    public addMixin(name: string, code: string) {
        this.mixins.push({ name, code });
    }

    public generate(): string {
        const exp = this.shouldBeExported ? "export " : "";
        const abs = this.isAbstract ? " abstract " : "";
        let code = `\n${exp}${abs}class ${this.name}`;
        if (this.parentClass) { code += " extends " + this.parentClass; }
        if (this.implementations.length) {
            code += " implements " + this.implementations.join(", ");
        }
        code += " {\n";
        if (this.properties.length) { code += `    ${this.getPropertiesCode()}\n`; }
        if (this.constructorMethod) {
            code += this.constructorMethod.generate();
        }
        const staticMethods: Array<MethodGen> = [];
        for (let i = 0, il = this.methods.length; i < il; ++i) {
            if (this.methods[i].isStatic()) {
                staticMethods.push(this.methods[i]);
            } else {
                code += `\n${this.methods[i].generate()}`;
            }
        }
        // placing the static methods at the end of class body
        for (let i = 0, il = staticMethods.length; i < il; ++i) {
            code += `\n${staticMethods[i].generate()}`;
        }
        this.mixins.forEach((mixin) => {
            code += mixin.code;
        });
        code += "}";
        return code;
    }

    public setAsAbstract(isAbstract: boolean = true) {
        this.isAbstract = isAbstract;
    }

    private getPropertiesCode(): string {
        const codes = [];
        for (let i = 0, il = this.properties.length; i < il; ++i) {
            let code = (this.properties[i].access ? this.properties[i].access : "public") + " ";
            if (this.properties[i].isStatic) { code += "static "; }
            code += this.properties[i].name;
            if (this.properties[i].isOptional) { code += "?"; }
            if (this.properties[i].type) { code += `: ${this.properties[i].type}`; }
            if (this.properties[i].defaultValue) { code += ` = ${this.properties[i].defaultValue}`; }
            code += ";";
            codes.push(code);
        }
        return codes.join("\n    ");
    }
}
