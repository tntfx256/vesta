import * as fs from "fs-extra";
import * as path from "path";
import * as _ from "lodash";
import {XMLGen} from "../../../../core/XMLGen";
import {INGControllerConfig} from "../NGControllerGen";
import {Util} from "../../../../../util/Util";
import {Model, IModelFields} from "../../../../../cmn/Model";
import {ModelGen} from "../../../ModelGen";
import {Schema} from "../../../../../cmn/Schema";
import {FieldType} from "../../../../../cmn/Field";

export class MaterialListGen {
    private list:XMLGen;
    private path:string = 'src/app/templates';

    constructor(private config:INGControllerConfig) {
        var ctrlName = _.camelCase(this.config.name);
        this.list = new XMLGen('div');
        this.list.setAttribute('layout', 'column');
        this.path = path.join(this.path, config.module, ctrlName);
        try {
            fs.mkdirpSync(this.path);
        } catch (e) {
        }
    }

    generate() {
        var ctrlName = _.camelCase(this.config.name),
            code = this.createHeader() + this.createContent() + this.getPaginator();
        this.list.html(code);
        Util.fs.writeFile(path.join(this.path, `${ctrlName}List.html`), this.list.generate());
    }

    private createHeader() {
        var pluralModel = Util.plural(this.config.model);
        return `
    <md-data-table-toolbar ng-show="!vm.detOption.showFilter&&!vm.selected.length">
        <h2 class="box-title">{{vm.dtOption.title}}</h2>

        <div flex></div>
        <md-button class="md-icon-button" ng-click="vm.dtOption.showFilter=true">
            <md-icon>filter_list</md-icon>
        </md-button>
        <md-button class="md-icon-button" ng-click="vm.add${this.config.model}($event)">
            <md-icon>add</md-icon>
        </md-button>
    </md-data-table-toolbar>

    <md-data-table-toolbar ng-show="vm.selected${pluralModel}List.length">
        <p>Number of selected records: {{vm.selected${pluralModel}List.length}}</p>

        <div flex></div>
        <md-button class="md-icon-button" ng-click="vm.del${this.config.model}($event)">
            <md-icon>delete</md-icon>
        </md-button>
    </md-data-table-toolbar>

    <md-data-table-toolbar ng-show="vm.dtOption.showFilter&&!vm.selected${pluralModel}List.length">

        <md-button class="md-icon-button">
            <md-icon>search</md-icon>
        </md-button>

        <md-input-container flex>
            <input type="search" ng-model="vm.dtOption.filter" placeholder="Type search query"/>
        </md-input-container>

        <md-button class="md-icon-button" ng-click="vm.dtOption.showFilter=false">
            <md-icon>clear</md-icon>
        </md-button>

    </md-data-table-toolbar>`;
    }

    private createContent() {
        var pluralModel = Util.plural(this.config.model),
            pluralInstance = _.camelCase(pluralModel),
            modelInstanceName = _.camelCase(this.config.model),
            model:Model = ModelGen.getModel(this.config.model),
            schema:Schema = model['schema'],
            fields:IModelFields = schema.getFields(),
            headerCode = `<th>row</th>`,
            rowCode = `<td>{{$index + 1 + (vm.dtOption.page - 1 ) * vm.dtOption.limit }}</td>`;
        Object.keys(fields).forEach(fieldName => {
            var properties = fields[fieldName].properties;
            switch (properties.type) {
                case FieldType.String :
                case FieldType.Text :
                case FieldType.Tel :
                case FieldType.EMail :
                case FieldType.URL :
                case FieldType.Number :
                case FieldType.Integer :
                case FieldType.Float :
                    headerCode += `<th>${fieldName}</th>`;
                    rowCode += `<td>{{${modelInstanceName}.${fieldName}}}</td>`;
                    break;
                case FieldType.Timestamp :
                    headerCode += `<th>${fieldName}</th>`;
                    rowCode += `<td>{{${modelInstanceName}.${fieldName} | dateTime}}</td>`;
                    break;
                case FieldType.Boolean :
                    headerCode += `<th>${fieldName}</th>`;
                    rowCode += `<td>{{${modelInstanceName}.${fieldName}?'Yes':'No'}}</td>`;
                    break;
                case FieldType.Enum :
                    headerCode += `<th>${fieldName}</th>`;
                    rowCode += `<td>{{vm.${_.capitalize(fieldName)}[${modelInstanceName}.${fieldName}]}}</td>`;
                    break;
                case FieldType.File :
                case FieldType.Password :
                case FieldType.Object :
                    break;
            }
        });

        return `
    <md-data-table-container>
        <table md-data-table md-row-select="vm.selected${pluralModel}List">

            <thead md-order="vm.dtOption.order">
            <tr>
                ${headerCode}
                <th>&nbsp;</th>
            </tr>
            </thead>
            <tbody>
            <tr md-auto-select
                ng-repeat="${modelInstanceName} in vm.${pluralInstance}List  | filter:vm.dtOption.filter | pagination:vm.dtOption.page:vm.dtOption.limit:vm.dtOption.total:vm.dtOption.loadMore track by $index">
                ${rowCode}
                <td>
                    <md-button class="md-icon-button" ng-click="vm.edit${this.config.model}($event, ${modelInstanceName}.id)">
                        <md-icon>mode_edit</md-icon>
                    </md-button>
                </td>
            </tr>
            </tbody>
        </table>
    </md-data-table-container>`;
    }

    private getPaginator() {
        return `
    <md-table-pagination md-limit="vm.dtOption.limit"
                              md-page="vm.dtOption.page"
                              md-total="{{vm.dtOption.total}}"
                              md-trigger="vm.dtOption.onPaginationChange"
                              md-row-select="vm.dtOption.rowsPerPage"
                              md-label="vm.dtOption.label">
    </md-table-pagination>`;
    }
}
