import { Log } from "util/Log";
import { camelCase } from "util/StringUtil";

export interface IMethodParameter {
  name: string;
  type?: string;
  isOptional?: boolean;
  access?: string;
  defaultValue?: string;
}

export class FunctionGen {
  private content: string = "";
  private parameters: IMethodParameter[] = [];
  private methodType: string = "";
  private isAsync: boolean = false;
  private isArrow: boolean = false;
  private shouldBeExported: boolean = false;
  private isConstructor: boolean = false;

  constructor(public name: string = "") {
    if (!name) {
      this.isConstructor = true;
    } else {
      this.name = camelCase(name);
    }
  }

  public setAsAsync(isAsync: boolean = false) {
    this.isAsync = isAsync;
  }

  public setAsArrowFunction(isArrowFunction: boolean = true) {
    this.isArrow = isArrowFunction;
  }

  public shouldExport(shouldBeExported: boolean = true) {
    this.shouldBeExported = shouldBeExported;
  }

  public addParameter(parameter: IMethodParameter) {
    for (let i = this.parameters.length; i--; ) {
      if (this.parameters[i].name === parameter.name) {
        return Log.error(`A parameter with the same name (${parameter.name}) already exists`);
      }
    }
    this.parameters.push(parameter);
  }

  public setMethodType(type: string) {
    this.methodType = `: ${type}`;
  }

  public setContent(code: string) {
    this.content = code;
  }

  public getContent(): string {
    return this.content;
  }

  public appendContent(code: string) {
    this.content = this.content ? `${this.content}\n    ${code}` : code;
  }

  public prependContent(code: string) {
    this.content = code + (this.content ? `\n${this.content}` : "");
  }

  public generate(): string {
    const parametersCode = this.getParameterCode();
    const exportCode = this.shouldBeExported ? `export ` : "";
    const asyncCode = this.isAsync ? `async ` : "";
    const ending = this.isArrow ? ";" : "";
    const functionDefinition = this.isArrow
      ? `${exportCode}const ${this.name} = () => {`
      : `${exportCode}${asyncCode}function ${this.name}(${parametersCode}){`;
    return `${functionDefinition}\n${this.content}\n}${ending}\n`;
  }

  private getParameterCode(): string {
    const codes = [];
    for (let i = 0, il = this.parameters.length; i < il; ++i) {
      const parameter = this.parameters[i];
      let code = "";
      const type = parameter.type ? `: ${parameter.type}` : "";
      const opt = parameter.isOptional ? "?" : "";
      code = `${parameter.name}${opt}${type}`;
      if (parameter.defaultValue) {
        code += ` = ${parameter.defaultValue}`;
      }
      codes.push(code);
    }
    return codes.join(", ");
  }
}
