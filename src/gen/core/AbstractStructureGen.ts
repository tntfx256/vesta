import {camelCase, pascalCase} from "../../util/StringUtil";
import {MethodGen} from "./MethodGen";

export interface IMethods {
    [name: string]: MethodGen;
}

export interface IStructureProperty {
    name: string;
    type?: string;
    isOptional?: boolean;
    access?: string;
    defaultValue?: string;
    isStatic?: boolean;
}

export abstract class AbstractStructureGen {
    public name: string;
    protected shouldBeExported: boolean = false;
    protected methods: MethodGen[] = [];
    protected properties: IStructureProperty[] = [];
    protected parentClass: string;
    protected implementations: string[] = [];
    protected constructorMethod: MethodGen;

    constructor(name: string) {
        this.name = pascalCase(name);
    }

    public setConstructor(): MethodGen {
        this.constructorMethod = new MethodGen();
        return this.constructorMethod;
    }

    public getConstructor(): MethodGen {
        if (!this.constructorMethod) {
            this.setConstructor();
        }
        return this.constructorMethod;
    }

    public addMethod(name: string): MethodGen {
        for (let i = this.methods.length; i--;) {
            if (this.methods[i].name === name) {
                return this.methods[i];
            }
        }
        const method = new MethodGen(name);
        this.methods.push(method);
        return method;
    }

    public getMethod(name: string): MethodGen {
        name = camelCase(name);
        for (let i = this.methods.length; i--;) {
            if (this.methods[i].name === name) {
                return this.methods[i];
            }
        }
        return null;
    }

    public shouldExport(shouldBeExported: boolean = true) {
        this.shouldBeExported = shouldBeExported;
    }

    public setParentClass(className: string) {
        this.parentClass = className;
    }

    public addImplements(...interfaces: string[]) {
        interfaces.forEach((intfc) => {
            if (this.implementations.indexOf(intfc) < 0) {
                this.implementations.push(intfc);
            }
        });
    }

    public addProperty(property: IStructureProperty) {
        for (let i = this.properties.length; i--;) {
            if (this.properties[i].name === property.name) {
                return;
            }
        }
        this.properties.push(property);
    }

    public abstract generate(): string;
}
