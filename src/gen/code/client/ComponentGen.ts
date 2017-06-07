import * as fs from "fs";
import * as _ from "lodash";
import {Vesta} from "../../file/Vesta";
import {FsUtil} from "../../../util/FsUtil";
import {StringUtil} from "../../../util/StringUtil";
import {Arguments} from "../../../util/Arguments";
import {Log} from "../../../util/Log";
import {TsFileGen} from "../../core/TSFileGen";
import {Util} from "../../../util/Util";

export class ComponentGen {
    private vesta: Vesta;
    private className: string;
    private path = 'src/client/app/components/';

    constructor(private name: string, path: string = 'roo', private stateless?) {
        this.vesta = Vesta.getInstance();
        this.path += path;
        this.className = StringUtil.fcUpper(this.name);
        FsUtil.mkdir(this.path);
    }

    private genStateless() {
        return `import React from "react";
export interface ${this.className}Params {
}

export interface ${this.className}Props extends RouteComponentProps<${this.className}Params>{
}

export const ${this.className} = (props: ${this.className}Props) => (<div><h1>${this.className} Component</h1></div>);

`;
    }

    private genStateful() {
        let stateName = _.camelCase(this.className);
        let componentFile = new TsFileGen(this.className);
        componentFile.addImport('React', 'react', TsFileGen.ImportType.Module);
        componentFile.addImport('{RouteComponentProps}', 'react-router');
        componentFile.addImport('{AuthService}', Util.genRelativePath(this.path, 'src/client/app/service/AuthService'));
        componentFile.addImport('{PageComponent}', Util.genRelativePath(this.path, 'src/client/app/components/PageComponent'));
        // params interface
        let paramInterface = componentFile.addInterface(`${this.className}Params`);
        let propsInterface = componentFile.addInterface(`${this.className}Props`);
        propsInterface.setParentClass(`PageComponentProps<${paramInterface.name}>`);
        let stateInterface = componentFile.addInterface(`${this.className}State`);
        stateInterface.setParentClass(`PageComponentState`);
        // component class
        let componentClass = componentFile.addClass(this.className);
        componentClass.setConstructor();
        componentClass.getConstructor().addParameter({name: 'props', type: propsInterface.name});
        componentClass.getConstructor().setContent(`super(props);
        this.state = {};`);
        componentClass.setParentClass(`PageComponent<${propsInterface.name}, ${stateInterface.name}>`);
        (componentClass.addMethod('render')).setContent(`return (
            <div className="page ${stateName}-component">
                <h1>${this.className} Component</h1>
            </div>
        );`);
        let pMethod = componentClass.addMethod('registerPermission');
        pMethod.setAsStatic();
        pMethod.addParameter({name: 'id', type: 'string'});
        pMethod.setContent(`AuthService.getInstance().registerPermissions(id, {${stateName}: ['read']});`);
        return componentFile.generate();
    }

    private createScss() {
        let stateName = _.camelCase(this.className);
        fs.writeFileSync(`src/client/scss/components/_${stateName}.scss`, `.${stateName}-component {\n\n}`, {encoding: 'utf8'});
        Util.findInFileAndReplace('src/client/scss/_common.scss', {'///<vesta:scssComponent/>': `@import "components/${stateName}";\n///<vesta:scssComponent/>`}, true);
    }

    public generate() {
        let code = this.stateless ? this.genStateless() : this.genStateful();
        fs.writeFileSync(`${this.path}/${this.className}.tsx`, code);
        this.createScss();
    }

    static getInstance(args: Array<string>): ComponentGen {
        let arg = new Arguments(args);
        let name = arg.get();
        if (!name) {
            process.stderr.write('Missing component name\n');
            ComponentGen.help();
            return null;
        }
        let path = arg.get('--path', 'root');
        let stateless = arg.has('--stateless');
        return new ComponentGen(name, path, stateless);
    }

    static help() {
        Log.write(`
Usage: vesta gen component [options...] NAME

Creating React component 

    NAME        The name of the component
    
Options:
    --stateless Generates a stateless component
    --path      Parent hierarchy  
`);
    }
}