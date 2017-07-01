import * as path from "path";
import {ClassGen} from "./ClassGen";
import {InterfaceGen} from "./InterfaceGen";
import {EnumGen} from "./EnumGen";
import {MethodGen} from "./MethodGen";
import {Log} from "../../util/Log";
import {camelCase, pascalCase} from "../../util/StringUtil";
import {writeFile} from "../../util/FsUtil";

export interface IImportStatement {
    name: string;
    from: string;
    type?: number;
}

export interface IMixin {
    name?: string;
    code: string;
    position?: number;
}

export class TsFileGen {
    static CodeLocation = {AfterImport: 1, AfterEnum: 2, AfterInterface: 3, AfterClass: 4, AfterMethod: 5};
    static ImportType = {Module: 1, Require: 2, Legacy: 3, Namespace: 4};
    private refs: Array<string> = [];
    private mixins: Array<IMixin> = [];
    private methods: Array<MethodGen> = [];
    private enums: Array<EnumGen> = [];
    private classes: Array<ClassGen> = [];
    private interfaces: Array<InterfaceGen> = [];
    private importStatements: Array<string> = [];
    private importCache: Array<{ name: string; path: string }> = [];

    constructor(public name: string) {
    }

    public addReference(...refs: Array<string>): void {
        refs.forEach(ref => {
            if (this.refs.indexOf(ref) < 0) {
                this.refs.push(ref);
            }
        });
    }

    /**
     * Module:      <code>import nameParameter from 'fromParameter'</code>
     * Require:     <code>import nameParameter = require('fromParameter')</code>
     * Legacy:      <code>let nameParameter = require('fromParameter')</code>
     * Namespace:   <code>import nameParameter = fromParameter</code>
     */
    public addImport(name: string, from: string, type: number = TsFileGen.ImportType.Module) {
        // let names = name.split(/\s*,\s*/);
        // let realNames = [];
        // for (let i = names.length; i--;) {
        //     realNames.push(names[i].replace(/\{}/g, ''));
        // }
        // for (let i = this.importCache.length; i--;) {
        //     if (this.importCache[i].name == name && this.importCache[i].path == from) return;
        // }
        let statement = `import ${name} `;
        switch (type) {
            case TsFileGen.ImportType.Require:
                statement += `= require("${from}");`;
                break;
            case TsFileGen.ImportType.Namespace:
                statement += `= ${from};`;
                break;
            case TsFileGen.ImportType.Legacy:
                statement = `let ${name} = require("${from}");`;
                break;
            default:
                statement += `from "${from}";`;
        }
        if (this.importStatements.indexOf(statement) < 0) {
            this.importStatements.push(statement);
        }
    }

    public addClass(name?: string, isAbstract?: boolean): ClassGen {
        if (!name) {
            name = this.name;
        }
        name = pascalCase(name);
        let clss = this.getClass(name);
        if (clss) return clss;
        clss = new ClassGen(name, isAbstract);
        this.classes.push(clss);
        return clss;
    }

    public getClass(name: string): ClassGen {
        name = pascalCase(name);
        for (let i = this.classes.length; i--;) {
            if (this.classes[i].name == name) {
                return this.classes[i];
            }
        }
        return null;
    }

    public addInterface(inputName: string): InterfaceGen {
        let name = pascalCase(inputName);
        let intfc = this.getInterface(name);
        if (intfc) return intfc;
        intfc = new InterfaceGen(name);
        this.interfaces.push(intfc);
        return intfc;
    }

    public getInterface(name: string): InterfaceGen {
        name = pascalCase(name);
        if (name.charAt(0) != 'I') name += `I${name}`;
        for (let i = this.interfaces.length; i--;) {
            if (this.interfaces[i].name == name) {
                return this.interfaces[i];
            }
        }
        return null;
    }

    public addEnum(name: string): EnumGen {
        name = pascalCase(name);
        let enm = this.getEnum(name);
        if (enm) return enm;
        enm = new EnumGen(name);
        this.enums.push(enm);
        return enm;
    }

    public getEnum(name: string): EnumGen {
        name = pascalCase(name);
        for (let i = this.enums.length; i--;) {
            if (this.enums[i].name == name) {
                return this.enums[i];
            }
        }
        return null;
    }

    public addMethod(name: string): MethodGen {
        name = camelCase(name);
        let method = this.getMethod(name);
        if (method) return method;
        method = new MethodGen(name);
        this.methods.push(method);
        return method;
    }

    public getMethod(name: string): MethodGen {
        name = camelCase(name);
        for (let i = this.methods.length; i--;) {
            if (this.enums[i].name == name) {
                return this.methods[i];
            }
        }
        return null;
    }

    public addMixin(code: string, position: number = TsFileGen.CodeLocation.AfterImport): void {
        this.mixins.push({code: code, position: position});
    }

    private getMixin(position) {
        let code = [];
        for (let i = 0, il = this.mixins.length; i < il; ++i) {
            if (this.mixins[i].position == position) {
                code.push(`${this.mixins[i].code}`);
            }
        }
        return code.length ? `${code.join('\n')}\n` : '';
    }

    public generate(): string {
        let code = '';
        code += this.refs.length ? `${this.refs.join('\n')}` : '';
        code += this.importStatements.length ? `${this.importStatements.join('\n')}\n` : '';
        code += this.getMixin(TsFileGen.CodeLocation.AfterImport);
        // enum
        for (let i = 0, il = this.enums.length; i < il; ++i) {
            code += this.enums[i].generate();
            code += code ? '\n' : '';
        }
        code += this.getMixin(TsFileGen.CodeLocation.AfterEnum);
        // interface
        for (let i = 0, il = this.interfaces.length; i < il; ++i) {
            code += '\n' + this.interfaces[i].generate() + '\n';
        }
        code += this.getMixin(TsFileGen.CodeLocation.AfterInterface);
        // classes
        for (let i = 0, il = this.classes.length; i < il; ++i) {
            code += this.classes[i].generate() + '\n';
        }
        code += this.getMixin(TsFileGen.CodeLocation.AfterClass);
        // methods
        for (let i = 0, il = this.methods.length; i < il; ++i) {
            code += this.methods[i].generate() + '\n';
        }
        code += this.getMixin(TsFileGen.CodeLocation.AfterMethod);
        return code;
    }

    public write(directory: string, ext: string = 'ts'): void {
        try {
            writeFile(path.join(directory, `${this.name}.${ext}`), this.generate());
        } catch (e) {
            Log.error(e.message);
        }
    }
}