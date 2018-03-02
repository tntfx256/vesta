import { Log } from "../../util/Log";
import { camelCase } from "../../util/StringUtil";
import { ClassGen } from "./ClassGen";

export interface IMethodParameter {
    name: string;
    type?: string;
    isOptional?: boolean;
    access?: string;
    defaultValue?: string;
}

export class MethodGen {
    private content: string = "";
    private parameters: Array<IMethodParameter> = [];
    private returnType: string = "";
    private accessType: string = "";
    private isConstructor: boolean = false;
    private isStaticMethod: boolean = false;
    private isAbstract: boolean = false;
    private isAsync: boolean = false;
    private isArrow: boolean = false;
    private shouldBeExported: boolean = false;
    private isSimpleMethod: boolean = false;
    private isInterface: boolean = false;

    constructor(public name: string = "") {
        if (!name) {
            this.isConstructor = true;
        } else {
            this.name = camelCase(name);
        }
    }

    public setAsStatic(isStatic: boolean = true) {
        this.isStaticMethod = isStatic;
    }

    public setAsAbstract(isAbstract: boolean = true) {
        this.isAbstract = isAbstract;
    }

    public setAsAsync(isAsync: boolean = false) {
        this.isAsync = isAsync;
    }

    public setAsArrowFunction(isArrowFunction: boolean = true) {
        this.isArrow = isArrowFunction;
    }

    public setAccessType(access: string = ClassGen.Access.Public) {
        this.accessType = access;
    }

    public isInterfaceMethod(isInterface: boolean = true) {
        this.isInterface = isInterface;
    }

    public shouldExport(shouldBeExported: boolean = true) {
        this.shouldBeExported = shouldBeExported;
    }

    public isSimple(isSimple: boolean = true) {
        this.isSimpleMethod = isSimple;
    }

    public isStatic(): boolean {
        return this.isStaticMethod;
    }

    // public get isStatic() {
    //     return this.isStaticMethod;
    // }
    // public set isStatic(isStatic: boolean) {
    //     this.isStaticMethod = isStatic;
    // }

    public getAccessType() {
        return this.accessType;
    }

    public addParameter(parameter: IMethodParameter) {
        for (let i = this.parameters.length; i--;) {
            if (this.parameters[i].name == parameter.name) {
                return Log.error(`A parameter with the same name (${parameter.name}) already exists`);
            }
        }
        this.parameters.push(parameter);
    }

    public setReturnType(type: string) {
        this.returnType = `: ${type}`;
    }

    public setContent(code: string) {
        this.content = code;
    }

    public getContent(): string {
        return this.content;
    }

    public appendContent(code: string) {
        this.content = this.content ? `${this.content}\n        ${code}` : code;
    }

    public prependContent(code: string) {
        this.content = code + (this.content ? `\n${this.content}` : "");
    }

    public generate(): string {
        const parametersCode = this.getParameterCode();
        if (this.isInterface) {
            return this.interfaceMethodGen(parametersCode);
        } else if (this.isSimpleMethod) {
            return this.simpleMethodGen(parametersCode);
        } else if (this.shouldBeExported) {
            return this.exportedMethodGen(parametersCode);
        }
        return this.classMethodGen(parametersCode);
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

    private interfaceMethodGen(parametersCode: string): string {
        if (this.isConstructor) {
            if (this.isInterface) {
                return `    new(${parametersCode});`;
            }
            return `
    constructor(${parametersCode}) {
        ${this.content}
    }`;
        }
        // not a constructor
        if (this.isInterface) {
            return `    ${this.name}(${parametersCode})${this.returnType};`;
        }
        let st = this.isStaticMethod ? " static" : "";
        st = this.isAsync ? `${st} async` : st;
        if (this.isAbstract) {
            return `    ${this.accessType}${st} ${this.name}(${parametersCode})${this.returnType};`;
        }
        return `    ${this.accessType}${st} ${this.name}(${parametersCode})${this.returnType} {
        ${this.content}
    }`;
    }

    private classMethodGen(parametersCode: string): string {
        if (this.isConstructor) {
            return `
    constructor(${parametersCode}) {
        ${this.content}
    }\n`;
        }
        // not a constructor
        const st = this.isStaticMethod ? " static" : "";
        const async = this.isAsync ? ` async` : "";
        if (this.isAbstract) {
            return `    ${this.accessType}${st} ${this.name}(${parametersCode})${this.returnType};\n`;
        }
        const content = this.content ? `
        ${this.content}` : "";
        return this.isArrow ?
            `    ${this.accessType}${st} ${this.name} =${async} (${parametersCode})${this.returnType} => {${content}
    }\n` :
            `    ${this.accessType}${async}${st} ${this.name}(${parametersCode})${this.returnType} {${content}
    }\n`;
    }

    private exportedMethodGen(parametersCode: string): string {
        return `export function ${this.name}(${parametersCode})${this.returnType} {
    ${this.content}
}\n`;
    }

    private simpleMethodGen(parametersCode: string): string {
        const exp = this.shouldBeExported ? "export " : "";
        return `${exp}function ${this.name}(${parametersCode})${this.returnType} {
    ${this.content}
}\n`;
    }
}
