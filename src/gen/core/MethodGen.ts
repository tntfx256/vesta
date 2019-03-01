import { Log } from "../../util/Log";
import { Access } from "./StructureGen";

export interface IMethodParameter {
    name: string;
    type?: string;
    isOptional?: boolean;
    access?: Access;
    defaultValue?: string;
}

export class MethodGen {
    public content: string = "";
    public parameters: IMethodParameter[] = [];
    public returnType: string = "";
    public accessType: Access = Access.None;
    public methodType: string = "";
    public isConstructor: boolean = false;
    public isStatic: boolean = false;
    public isAbstract: boolean = false;
    public isAsync: boolean = false;
    public isArrow: boolean = false;
    public shouldExport: boolean = false;
    public isSimple: boolean = false;
    public isInterface: boolean = false;

    private tab = "    ";
    private methods: MethodGen[] = [];

    constructor(public name: string = "", private indent = "") {
        if (!name) {
            this.isConstructor = true;
        }
    }

    public getAccessType() {
        return this.accessType;
    }

    public addMethod(name: string) {
        this.methods.push(new MethodGen(name, `${this.indent}${this.tab}`));
        return this.methods[this.methods.length - 1];
    }

    public addParameter(parameter: IMethodParameter) {
        for (let i = this.parameters.length; i--;) {
            if (this.parameters[i].name === parameter.name) {
                return Log.error(`A parameter with the same name (${parameter.name}) already exists`);
            }
        }
        this.parameters.push(parameter);
    }

    public appendContent(code: string) {
        const nl = this.content ? `\n` : "";
        this.content = `${this.content}${nl}${this.tab}${this.indent}${code}`;
    }

    public generate(): string {
        let code = this.indent;
        code += this.shouldExport ? "export " : "";
        code += this.accessType ? `${this.accessType} ` : "";
        code += this.isConstructor ? "constructor" : "";
        code += this.isArrow ? "const " : "";
        code += !this.isArrow && !this.isConstructor && !this.accessType ? "function " : "";
        code += this.isAsync ? "async " : "";
        code += this.name;
        code += this.isArrow && this.methodType ? `: ${this.methodType}` : "";
        code += this.isArrow ? " = " : "";
        code += `(${this.getParameterCode()})`;
        code += this.returnType && !this.isArrow ? `: ${this.returnType}` : "";
        code += this.isArrow ? " => {\n" : " {\n";
        // content
        code += this.content;
        // inner functions
        const methods: string[] = [];
        for (const method of this.methods) {
            methods.push(method.generate());
        }
        if (methods.length) {
            code += `\n\n${methods.join("\n\n")}`;
        }
        code += `\n${this.indent}}\n`;
        return code;
    }

    private getParameterCode(): string {
        const codes = [];
        for (let i = 0, il = this.parameters.length; i < il; ++i) {
            const parameter = this.parameters[i];
            let code = "";
            // const access = "";
            const type = parameter.type ? `: ${parameter.type}` : "";
            const opt = parameter.isOptional ? "?" : "";
            if (this.isConstructor) {
                const access = parameter.access ? (parameter.access + " ") : "";
                code = `${access}${parameter.name}${opt}${type}`;
            } else {
                code = `${parameter.name}${opt}${type}`;
            }
            if (!this.isInterface && parameter.defaultValue) {
                code += ` = ${parameter.defaultValue}`;
            }
            codes.push(code);
        }
        return codes.join(", ");
    }
}
