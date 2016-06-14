import * as fs from "fs-extra";
import * as path from "path";
import * as _ from "lodash";
import {XMLGen} from "../../../../core/XMLGen";
import {INGControllerConfig} from "../NGControllerGen";
import {Util} from "../../../../../util/Util";
import {ModelGen} from "../../../ModelGen";
import {FsUtil} from "../../../../../util/FsUtil";
import {Model, IModelFields} from "vesta-schema/Model";
import {Schema} from "vesta-schema/Schema";
import {FieldType} from "vesta-schema/Field";

export class MaterialListGen {
    private list:XMLGen;
    private path:string = 'src/app/templates';

    constructor(private config:INGControllerConfig) {
        var ctrlName = _.camelCase(this.config.name);
        this.list = new XMLGen('div');
        this.list.setAttribute('layout', 'column').addClass('dt-wrapper');
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
        FsUtil.writeFile(path.join(this.path, `${ctrlName}List.html`), this.list.generate());
    }

    private createHeader() {
        var modelName = ModelGen.extractModelName(this.config.model);
        var pluralModel = Util.plural(modelName);
        return `
    <md-toolbar class="md-table-toolbar md-default" ng-hide="vm.dtOption.showFilter || (vm.acl.delete && vm.selected${pluralModel}List.length)">
        <div class="md-toolbar-tools">
            <h2 class="box-title">{{vm.dtOption.title}}</h2>
            <div flex></div>
            <md-button class="md-icon-button" ng-click="vm.dtOption.showFilter=true">
                <md-icon>filter_list</md-icon>
            </md-button>
            <md-button ng-if="vm.acl.create" class="md-icon-button" ng-click="vm.add${modelName}($event)">
                <md-icon>add</md-icon>
            </md-button>
        </div>
    </md-toolbar>
    <md-toolbar class="md-table-toolbar md-default" ng-show="vm.selected${pluralModel}List.length && vm.acl.delete">
        <div class="md-toolbar-tools">
            <p>Number of selected records: {{vm.selected${pluralModel}List.length}}</p>
            <div flex></div>
            <md-button class="md-icon-button" ng-click="vm.del${modelName}($event)">
                <md-icon>delete</md-icon>
            </md-button>
        </div>
    </md-toolbar>

    <md-toolbar class="md-table-toolbar md-default" ng-show="vm.dtOption.showFilter && !vm.selected${pluralModel}List.length">
        <div class="md-toolbar-tools">
            <md-button class="md-icon-button">
                <md-icon>search</md-icon>
            </md-button>
            <md-input-container flex>
                <input type="search" ng-model="vm.dtOption.filter" placeholder="Type search query"/>
            </md-input-container>
            <md-button class="md-icon-button" ng-click="vm.dtOption.showFilter=false">
                <md-icon>clear</md-icon>
            </md-button>
        </div>
    </md-toolbar>`;
    }

    private createContent() {
        var modelName = ModelGen.extractModelName(this.config.model),
            pluralModel = Util.plural(modelName),
            pluralInstance = _.camelCase(pluralModel),
            modelInstanceName = _.camelCase(modelName),
            model:Model = ModelGen.getModel(this.config.model),
            schema:Schema = model['schema'],
            fields:IModelFields = schema.getFields(),
            headerCode = `<th md-column>row</th>`,
            rowCode = `<td md-cell>{{$index + 1 + (vm.dtOption.page - 1 ) * vm.dtOption.limit }}</td>`,
            splitter = '\n                ';
        Object.keys(fields).forEach(fieldName => {
            if (fieldName == 'id') return;
            var properties = fields[fieldName].properties;
            switch (properties.type) {
                case FieldType.String :
                case FieldType.Text :
                case FieldType.Tel :
                case FieldType.EMail :
                case FieldType.URL :
                    headerCode += `${splitter}<th md-column md-order-by="${fieldName}">${fieldName}</th>`;
                    rowCode += `${splitter}<td md-cell>{{${modelInstanceName}.${fieldName}}}</td>`;
                    break;
                case FieldType.Number :
                case FieldType.Integer :
                case FieldType.Float :
                    headerCode += `${splitter}<th md-column md-numeric md-order-by="${fieldName}">${fieldName}</th>`;
                    rowCode += `${splitter}<td md-cell>{{${modelInstanceName}.${fieldName}}}</td>`;
                    break;
                case FieldType.Timestamp :
                    headerCode += `${splitter}<th md-column md-order-by="${fieldName}">${fieldName}</th>`;
                    rowCode += `${splitter}<td md-cell>{{${modelInstanceName}.${fieldName} | dateTime}}</td>`;
                    break;
                case FieldType.Boolean :
                    headerCode += `${splitter}<th md-column md-order-by="${fieldName}">${fieldName}</th>`;
                    rowCode += `${splitter}<td md-cell><md-checkbox ng-disabled="true" ng-model="${modelInstanceName}.${fieldName}"></md-checkbox></td>`;
                    break;
                case FieldType.Enum :
                    headerCode += `${splitter}<th md-column md-order-by="${fieldName}">${fieldName}</th>`;
                    rowCode += `${splitter}<td md-cell>{{vm.${_.capitalize(fieldName)}[${modelInstanceName}.${fieldName}]}}</td>`;
                    break;
                case FieldType.File :
                case FieldType.Password :
                case FieldType.Object :
                    break;
            }
        });

        return `
    <md-table-container>
        <table md-table md-row-select multiple ng-model="vm.selected${pluralModel}List">

            <thead md-head md-order="vm.dtOption.order">
            <tr>
                ${headerCode}
                <th md-column ng-if="vm.acl.update">&nbsp;</th>
            </tr>
            </thead>
            <tbody md-body>
            <tr md-row md-auto-select md-select="${modelInstanceName}.id"
                ng-repeat="${modelInstanceName} in vm.${pluralInstance}List  | filter:vm.dtOption.filter | pagination:vm.dtOption.page:vm.dtOption.limit:vm.dtOption.total:vm.dtOption.loadMore track by $index">
                ${rowCode}
                <td md-cell ng-if="vm.acl.update">
                    <md-button class="md-icon-button" ng-click="vm.edit${modelName}($event, ${modelInstanceName}.id)">
                        <md-icon>mode_edit</md-icon>
                    </md-button>
                </td>
            </tr>
            </tbody>
        </table>
    </md-table-container>`;
    }

    private getPaginator() {
        return `
    <md-table-pagination 
        md-limit="vm.dtOption.limit"
        md-page="vm.dtOption.page"
        md-total="{{vm.dtOption.total}}"
        md-limit-options="vm.dtOption.rowsPerPage"
        md-page-select="true"
        md-on-paginate="vm.loadMore">
    </md-table-pagination>`;
    }
}
