import * as fs from "fs";
import {CrudComponentGenConfig} from "../ComponentGen";
import {TsFileGen} from "../../../core/TSFileGen";
import {genRelativePath, mkdir} from "../../../../util/FsUtil";
import {camelCase, plural} from "../../../../util/StringUtil";

export class ListComponentGen {
    private className: string;

    constructor(private config: CrudComponentGenConfig) {
        this.className = `${config.modelConfig.originalClassName}List`;
        mkdir(config.path);
    }

    private genCrudListComponent() {
        let model = this.config.modelConfig;
        let path = this.config.path;
        let stateName = camelCase(this.config.name);
        let pluralModel = plural(model.instanceName);
        // ts file
        let listFile = new TsFileGen(this.className);
        // imports
        listFile.addImport('React', 'react');
        listFile.addImport('{Link}', 'react-router-dom');
        listFile.addImport('{PageComponent, PageComponentProps, PageComponentState}', genRelativePath(path, 'src/client/app/components/PageComponent'));
        listFile.addImport(`{I${model.originalClassName}}`, genRelativePath(path, `src/client/app/cmn/models/${model.originalClassName}`));
        listFile.addImport('{Column, DataTable, DataTableOption}', genRelativePath(path, 'src/client/app/components/general/DataTable'));
        listFile.addImport('{FloatingBtn}', genRelativePath(path, 'src/client/app/components/general/FloatingBtn'));
        // params
        listFile.addInterface(`${this.className}Params`);
        let listProps = listFile.addInterface(`${this.className}Props`);
        // props
        listProps.setParentClass(`PageComponentProps<${this.className}Params>`);
        listProps.addProperty({name: 'fetch', type: `() => Promise<Array<I${model.originalClassName}>>`});
        // state
        let listState = listFile.addInterface(`${this.className}State`);
        listState.setParentClass('PageComponentState');
        listState.addProperty({name: pluralModel, type: `Array<I${model.originalClassName}>`});
        // class
        let listClass = listFile.addClass(this.className);
        listClass.setParentClass(`PageComponent<${this.className}Props, ${this.className}State>`);
        // constructor
        listClass.setConstructor();
        listClass.getConstructor().addParameter({name: 'props', type: `${this.className}Props`});
        listClass.getConstructor().setContent(`super(props);
        this.state = {${pluralModel}: []};`);
        // fetch
        listClass.addMethod('componentDidMount').setContent(`this.props.fetch().then(${pluralModel} => this.setState({${pluralModel}}));`);
        // render method
        listClass.addMethod('render').setContent(`const dtOptions: DataTableOption<I${model.originalClassName}> = {
            showIndex: true
        };
        const columns: Array<Column<I${model.originalClassName}>> = [
            {name: 'id', title: 'ID'},
            {
                title: 'Operations', render: r => <span className="dt-operation-cell">
                <Link to={\`/${stateName}/detail/\${r.id}\`}>View</Link>
                <Link to={\`/${stateName}/edit/\${r.id}\`}>Edit</Link></span>
            }
        ];
        return (
            <div className="page commandList-component">
                <DataTable option={dtOptions} columns={columns} records={this.state.${pluralModel}}/>
                <FloatingBtn className="fb-success" title="Add" onClick={e => this.props.history.push('/${stateName}/add')}/>
            </div>
        );`);
        return listFile.generate();
        // <h1>${plural(model.originalClassName)}'s List</h1>
    }

    public generate() {
        let code = this.genCrudListComponent();
        // generate file
        fs.writeFileSync(`${this.config.path}/${this.className}.tsx`, code);
    }
}