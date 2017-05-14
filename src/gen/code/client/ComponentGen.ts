import * as fs from "fs";
import * as _ from "lodash";
import {Vesta} from "../../file/Vesta";
import {FsUtil} from "../../../util/FsUtil";
import {StringUtil} from "../../../util/StringUtil";
import {Arguments} from "../../../util/Arguments";

export class ComponentGen {
    private vesta: Vesta;
    private className: string;
    private path = 'src/client/app/components/root';

    constructor(private name: string, path: string = '/', private stateless?) {
        this.vesta = Vesta.getInstance();
        this.path += path;
        this.className = StringUtil.fcUpper(this.name);
        FsUtil.mkdir(this.path);
    }

    private genStateless() {
        return `import React from "react";

export interface ${this.className}Props {
}

export const ${this.className} = (props: ${this.className}Props) => (<div><h1>${this.className} Component</h1></div>);

`;
    }

    private genStateful() {
        let stateName = _.camelCase(this.className);
        return `import React from "react";
import {PageComponent} from "../PageComponent";

export interface ${this.className}Props {
}

export interface ${this.className}State {
}

export class ${this.className} extends PageComponent<${this.className}Props, ${this.className}State> {
    
    public render() {
        return (
            <div><h1>${this.className} Component</h1></div>
        );
    }

    static registerPermission(id) {
        AuthService.getInstance().registerPermissions(id, {${stateName}: ['read']});
    }
}
`;
    }

    public generate() {
        let code = this.stateless ? this.genStateless() : this.genStateful();
        fs.writeFileSync(`${this.path}/${this.className}.tsx`, code);
    }

    static getInstance(args: Array<string>): ComponentGen {
        let arg = new Arguments(args);
        let name = arg.get();
        if (!name) {
            process.stderr.write('Missing component name\n');
            ComponentGen.help();
            return null;
        }
        let path = arg.get('--path', '/');
        let stateless = arg.has('--stateless');
        return new ComponentGen(name, path, stateless);
    }

    static help() {
        process.stdout.write(`
Usage: vesta gen component [options...] NAME

Creating React component 

    NAME        The name of the component
    
Options:
    --stateless Generates a stateless component
    --path      Parent hierarchy  
`);
    }
}