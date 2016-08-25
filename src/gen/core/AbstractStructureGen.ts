import * as _ from "lodash";
import {MethodGen} from "./MethodGen";
import {StringUtil} from "../../util/StringUtil";

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
    protected shouldBeExported: boolean = true;
    protected methods: Array<MethodGen> = [];
    protected properties: Array<IStructureProperty> = [];
    protected parentClass: string;
    protected implementations: Array<string> = [];
    protected constructorMethod: MethodGen;

    constructor(name: string) {
        this.name = StringUtil.fcUpper(_.camelCase(name));
    }

    public setConstructor(): MethodGen {
        this.constructorMethod = new MethodGen();
        return this.constructorMethod;
    }

    public getConstructor(): MethodGen {
        return this.constructorMethod;
    }

    public addMethod(name: string): MethodGen {
        for (var i = this.methods.length; i--;) {
            if (this.methods[i].name == name) {
                return this.methods[i];
            }
        }
        var method = new MethodGen(name);
        this.methods.push(method);
        return method;
    }

    public getMethod(name: string): MethodGen {
        name = _.camelCase(name);
        for (var i = this.methods.length; i--;) {
            if (this.methods[i].name == name) {
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

    public addImplements(...interfaces: Array<string>) {
        interfaces.forEach(intfc=> {
            if (this.implementations.indexOf(intfc) < 0) {
                this.implementations.push(intfc);
            }
        })
    }

    public addProperty(property: IStructureProperty) {
        for (var i = this.properties.length; i--;) {
            if (this.properties[i].name == property.name) {
                return;
            }
        }
        this.properties.push(property);
    }

    public abstract generate(): string;
}
