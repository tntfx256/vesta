import * as _ from "lodash";
import {ClassGen} from "./ClassGen";
import {Log} from "../../util/Log";

export interface IMethodParameter {
    name:string;
    type?:string;
    isOptional?:boolean;
    access?:string;
    defaultValue?:string;
}

export class MethodGen {
    private content:string = '';
    private parameters:Array<IMethodParameter> = [];
    private returnType:string = '';
    private accessType:string = '';
    private isConstructor:boolean = false;
    private isStatic:boolean = false;
    private isAbstract:boolean = false;
    private shouldBeExported:boolean = false;
    private isSimpleMethod:boolean = false;
    private isInterface:boolean = false;

    constructor(public name:string = '') {
        if (!name) {
            this.isConstructor = true;
        } else {
            this.name = _.camelCase(name);
        }
    }

    public setAsStatic(isStatic:boolean = true) {
        this.isStatic = isStatic;
    }

    public setAsAbstract(isAbstract:boolean = true) {
        this.isAbstract = isAbstract;
    }

    public setAccessType(access:string = ClassGen.Access.Public) {
        this.accessType = access;
    }

    public isInterfaceMethod(isInterface:boolean = true) {
        this.isInterface = isInterface;
    }

    public shouldExport(shouldBeExported:boolean = true) {
        this.shouldBeExported = shouldBeExported;
    }

    public isSimple(isSimple:boolean = true) {
        this.isSimpleMethod = isSimple;
    }

    public addParameter(parameter:IMethodParameter) {
        for (var i = this.parameters.length; i--;) {
            if (this.parameters[i].name == parameter.name) {
                return Log.error(`A parameter with the same name (${parameter.name}) already exists`);
            }
        }
        this.parameters.push(parameter);
    }

    public setReturnType(type:string) {
        this.returnType = `: ${type}`;
    }

    public setContent(code:string) {
        this.content = code;
    }

    public getContent():string {
        return this.content;
    }

    public appendContent(code:string) {
        this.content = this.content ? `${this.content}\n        ${code}` : code;
    }

    public prependContent(code:string) {
        this.content = code + (this.content ? `\n${this.content}` : '');
    }

    private getParameterCode():string {
        var codes = [];
        for (var i = 0, il = this.parameters.length; i < il; ++i) {
            var parameter = this.parameters[i],
                code = '',
                access = '',
                type = parameter.type ? `: ${parameter.type}` : '',
                opt = parameter.isOptional ? '?' : '';
            if (this.isConstructor) {
                var access = parameter.access ? (parameter.access + ' ') : '';
                code = `${access}${parameter.name}${opt}${type}`;
            } else {
                code = `${parameter.name}${opt}${type}`;
            }
            if (!this.isInterface && parameter.defaultValue) {
                code += ` = ${parameter.defaultValue}`;
            }
            codes.push(code);
        }
        return codes.join(', ');
    }

    public generate():string {
        var parametersCode = this.getParameterCode();
        if (this.isInterface) {
            return this.interfaceMethodGen(parametersCode);
        } else if (this.isSimpleMethod) {
            return this.simpleMethodGen(parametersCode);
        } else if (this.shouldBeExported) {
            return this.exportedMethodGen(parametersCode);
        }
        return this.classMethodGen(parametersCode);
    }

    private interfaceMethodGen(parametersCode:string):string {
        if (this.isConstructor) {
            if (this.isInterface) {
                return `    new(${parametersCode});`
            }
            return `
    constructor(${parametersCode}) {
        ${this.content}
    }`
        }
        // not a constructor
        if (this.isInterface) {
            return `    ${this.name}(${parametersCode})${this.returnType};`;
        }
        var st = this.isStatic ? ' static' : '';
        if (this.isAbstract) {
            return `    ${this.accessType}${st} ${this.name}(${parametersCode})${this.returnType};`;
        }
        return `    ${this.accessType}${st} ${this.name}(${parametersCode})${this.returnType} {
        ${this.content}
    }`;
    }

    private classMethodGen(parametersCode:string):string {
        if (this.isConstructor) {
            return `
    constructor(${parametersCode}) {
        ${this.content}
    }\n`
        }
        // not a constructor
        var st = this.isStatic ? ' static' : '';
        if (this.isAbstract) {
            return `    ${this.accessType}${st} ${this.name}(${parametersCode})${this.returnType};\n`;
        }
        return `    ${this.accessType}${st} ${this.name}(${parametersCode})${this.returnType} {
        ${this.content}
    }\n`;
    }

    private exportedMethodGen(parametersCode:string):string {
        return `export function ${this.name}(${parametersCode})${this.returnType} {
    ${this.content}
}\n`;
    }

    private simpleMethodGen(parametersCode:string):string {
        var exp = this.shouldBeExported ? 'export ' : '';
        return `${exp}function ${this.name}(${parametersCode})${this.returnType} {
    ${this.content}
}\n`;
    }
}
