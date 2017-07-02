import * as fs from "fs";
import {CrudComponentGenConfig} from "../ComponentGen";
import {TsFileGen} from "../../../core/TSFileGen";
import {genRelativePath, mkdir} from "../../../../util/FsUtil";
import {camelCase} from "../../../../util/StringUtil";

export class DetailComponentGen {
    private className: string;

    constructor(private config: CrudComponentGenConfig) {
        this.className = `${config.modelConfig.originalClassName}Detail`;
        mkdir(config.path);
    }

    private genCrudDetailComponent() {
        let model = this.config.modelConfig;
        let path = this.config.path;
        let stateName = camelCase(this.config.name);
        // ts file
        let detailFile = new TsFileGen(this.className);
        // imports
        detailFile.addImport('React', 'react');
        detailFile.addImport('{FetchById, PageComponent, PageComponentProps, PageComponentState}', genRelativePath(path, 'src/client/app/components/PageComponent'));
        detailFile.addImport(`{I${model.originalClassName}}`, genRelativePath(path, `src/client/app/cmn/models/${model.originalClassName}`));
        // params
        detailFile.addInterface(`${this.className}Params`).addProperty({name: 'id', type: 'number'});
        let detailProps = detailFile.addInterface(`${this.className}Props`);
        detailProps.setParentClass(`PageComponentProps<${this.className}Params>`);
        detailProps.addProperty({name: model.instanceName, type: model.interfaceName});
        detailProps.addProperty({name: 'fetch', type: `FetchById`});
        let detailState = detailFile.addInterface(`${this.className}State`);
        detailState.setParentClass('PageComponentState');
        // class
        let detailClass = detailFile.addClass(this.className);
        detailClass.setParentClass(`PageComponent<${this.className}Props, ${this.className}State>`);
        // fetch
        detailClass.addMethod('componentDidMount').setContent(`this.props.fetch(+this.props.match.params.id);`);
        // render method
        detailClass.addMethod('render').setContent(`let ${model.instanceName} = this.props.${model.instanceName};
        if (!${model.instanceName}) return null;
        return (
            <div className="page ${model.instanceName}Detail-component">
                <table className="spec-table">
                    <thead>
                    <tr>
                        <th colSpan={2}>${model.originalClassName} #{${model.instanceName}.id}</th>
                    </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>
            </div>
        );`);
        return detailFile.generate();
    }

    public generate() {
        let code = this.genCrudDetailComponent();
        // generate file
        fs.writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }
}