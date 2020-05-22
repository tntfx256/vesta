import { camelCase } from "lodash";
import { join } from "path";
import { writeFile } from "../../util/FsUtil";
import { Log } from "../../util/Log";
import { pascalCase } from "../../util/StringUtil";
import { ClassGen } from "./ClassGen";
import { EnumGen } from "./EnumGen";
import { InterfaceGen } from "./InterfaceGen";
import { MethodGen } from "./MethodGen";

export interface ImportStatement {
  name: string;
  from: string;
  type?: number;
  isDefault?: boolean;
}

export interface ImportStorage {
  [from: string]: ImportStatement[];
}

export interface IMixin {
  name?: string;
  code: string;
  position?: number;
}

export class TsFileGen {
  public static CodeLocation = { AfterImport: 1, AfterEnum: 2, AfterInterface: 3, AfterClass: 4, AfterMethod: 5 };
  private refs: string[] = [];
  private mixins: IMixin[] = [];
  private methods: MethodGen[] = [];
  private enums: EnumGen[] = [];
  private classes: ClassGen[] = [];
  private interfaces: InterfaceGen[] = [];
  private importStatements: ImportStorage = {};

  constructor(public name: string) {}

  public addReference(...refs: string[]): void {
    refs.forEach((ref) => {
      if (this.refs.indexOf(ref) < 0) {
        this.refs.push(ref);
      }
    });
  }

  public addImport(modules: string[], from: string, isDefault?: boolean) {
    if (!this.importStatements[from]) {
      this.importStatements[from] = [];
    }
    for (let i = 0, il = modules.length; i < il; ++i) {
      if (!modules[i]) {
        continue;
      }
      let found = false;
      for (let j = this.importStatements[from].length; j--; ) {
        const st: ImportStatement = this.importStatements[from][j];
        if (st.name === modules[i]) {
          found = true;
          break;
        }
      }
      if (!found) {
        this.importStatements[from].push({ name: modules[i], from, isDefault });
      }
    }
  }

  public addClass(name?: string, isAbstract?: boolean): ClassGen {
    if (!name) {
      name = this.name;
    }
    name = pascalCase(name);
    let classObject = this.getClass(name);
    if (classObject) {
      return classObject;
    }
    classObject = new ClassGen(name, isAbstract);
    this.classes.push(classObject);
    return classObject;
  }

  public getClass(name?: string): ClassGen {
    if (!name) {
      return this.classes.length ? this.classes[0] : null;
    }
    name = pascalCase(name);
    for (let i = this.classes.length; i--; ) {
      if (this.classes[i].name === name) {
        return this.classes[i];
      }
    }
    return null;
  }

  public addInterface(inputName: string): InterfaceGen {
    const name = pascalCase(inputName);
    let intfc = this.getInterface(name);
    if (intfc) {
      return intfc;
    }
    intfc = new InterfaceGen(name);
    this.interfaces.push(intfc);
    return intfc;
  }

  public getInterface(name: string): InterfaceGen {
    name = pascalCase(name);
    if (name.charAt(0) !== "I") {
      name += `I${name}`;
    }
    for (let i = this.interfaces.length; i--; ) {
      if (this.interfaces[i].name === name) {
        return this.interfaces[i];
      }
    }
    return null;
  }

  public addEnum(name: string): EnumGen {
    name = pascalCase(name);
    let enm = this.getEnum(name);
    if (enm) {
      return enm;
    }
    enm = new EnumGen(name);
    this.enums.push(enm);
    return enm;
  }

  public getEnum(name: string): EnumGen {
    name = pascalCase(name);
    for (let i = this.enums.length; i--; ) {
      if (this.enums[i].name === name) {
        return this.enums[i];
      }
    }
    return null;
  }

  public addMethod(name: string): MethodGen {
    // name = camelCase(name);
    let method = this.getMethod(name);
    if (method) {
      return method;
    }
    method = new MethodGen(name);
    this.methods.push(method);
    return method;
  }

  public getMethod(name: string): MethodGen {
    name = camelCase(name);
    for (let i = this.methods.length; i--; ) {
      if (this.methods[i].name === name) {
        return this.methods[i];
      }
    }
    return null;
  }

  public addMixin(code: string, position: number = TsFileGen.CodeLocation.AfterImport): void {
    this.mixins.push({ code, position });
  }

  public generate(): string {
    let code = "";
    code += this.refs.length ? `${this.refs.join("\n")}` : "";
    code += this.getImportStatements();
    code += this.getMixin(TsFileGen.CodeLocation.AfterImport);
    // enum
    for (let i = 0, il = this.enums.length; i < il; ++i) {
      code += this.enums[i].generate();
      code += code ? "\n" : "";
    }
    code += this.getMixin(TsFileGen.CodeLocation.AfterEnum);
    // interface
    for (let i = 0, il = this.interfaces.length; i < il; ++i) {
      code += "\n" + this.interfaces[i].generate() + "\n";
    }
    code += this.getMixin(TsFileGen.CodeLocation.AfterInterface);
    // classes
    for (let i = 0, il = this.classes.length; i < il; ++i) {
      code += "\n" + this.classes[i].generate() + "\n";
    }
    code += this.getMixin(TsFileGen.CodeLocation.AfterClass);
    // functions
    for (let i = 0, il = this.methods.length; i < il; ++i) {
      code += "\n" + this.methods[i].generate() + "\n";
    }
    code += this.getMixin(TsFileGen.CodeLocation.AfterMethod);
    return code;
  }

  public write(directory: string, ext: string = "ts"): void {
    try {
      writeFile(join(directory, `${this.name}.${ext}`), this.generate());
    } catch (e) {
      Log.error(e.message);
    }
  }

  private getMixin(position) {
    const code = [];
    for (let i = 0, il = this.mixins.length; i < il; ++i) {
      if (this.mixins[i].position === position) {
        code.push(`${this.mixins[i].code}`);
      }
    }
    return code.length ? `${code.join("\n")}\n` : "";
  }

  private getImportStatements(): string {
    const codes = [];
    const nodeModules = [];
    const relativeModules = [];
    Object.keys(this.importStatements).forEach((path) => {
      if (path.startsWith(".")) {
        relativeModules.push(path);
      } else {
        nodeModules.push(path);
      }
    });
    const sortedPath = nodeModules.sort().concat(relativeModules.sort());
    // todo: we should sort path, tslint
    for (let i = 0, il = sortedPath.length; i < il; ++i) {
      const defaults = [];
      const modulars = [];
      for (let j = 0, jl = this.importStatements[sortedPath[i]].length; j < jl; ++j) {
        const st = this.importStatements[sortedPath[i]][j];
        if (st.isDefault) {
          defaults.push(st.name);
        } else {
          modulars.push(st.name);
        }
      }
      let code = "";
      if (defaults.length) {
        defaults.sort();
        code = defaults.join(", ");
      }
      if (modulars.length) {
        modulars.sort();
        code += `${code ? ", " : ""}{ ${modulars.join(", ")} }`;
      }
      codes.push(`import ${code} from "${sortedPath[i]}";`);
    }
    return codes.length ? `${codes.join("\n")}\n` : "";
  }
}
