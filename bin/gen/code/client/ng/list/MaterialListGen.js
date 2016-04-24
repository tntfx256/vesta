"use strict";
var fs = require("fs-extra");
var path = require("path");
var _ = require("lodash");
var XMLGen_1 = require("../../../../core/XMLGen");
var Util_1 = require("../../../../../util/Util");
var ModelGen_1 = require("../../../ModelGen");
var Field_1 = require("../../../../../cmn/Field");
var FsUtil_1 = require("../../../../../util/FsUtil");
var MaterialListGen = (function () {
    function MaterialListGen(config) {
        this.config = config;
        this.path = 'src/app/templates';
        var ctrlName = _.camelCase(this.config.name);
        this.list = new XMLGen_1.XMLGen('div');
        this.list.setAttribute('layout', 'column');
        this.path = path.join(this.path, config.module, ctrlName);
        try {
            fs.mkdirpSync(this.path);
        }
        catch (e) {
        }
    }
    MaterialListGen.prototype.generate = function () {
        var ctrlName = _.camelCase(this.config.name), code = this.createHeader() + this.createContent() + this.getPaginator();
        this.list.html(code);
        FsUtil_1.FsUtil.writeFile(path.join(this.path, ctrlName + "List.html"), this.list.generate());
    };
    MaterialListGen.prototype.createHeader = function () {
        var pluralModel = Util_1.Util.plural(this.config.model);
        return "\n    <md-data-table-toolbar ng-show=\"!vm.detOption.showFilter&&!vm.selected.length\">\n        <h2 class=\"box-title\">{{vm.dtOption.title}}</h2>\n\n        <div flex></div>\n        <md-button class=\"md-icon-button\" ng-click=\"vm.dtOption.showFilter=true\">\n            <md-icon>filter_list</md-icon>\n        </md-button>\n        <md-button class=\"md-icon-button\" ng-click=\"vm.add" + this.config.model + "($event)\">\n            <md-icon>add</md-icon>\n        </md-button>\n    </md-data-table-toolbar>\n\n    <md-data-table-toolbar ng-show=\"vm.selected" + pluralModel + "List.length\">\n        <p>Number of selected records: {{vm.selected" + pluralModel + "List.length}}</p>\n\n        <div flex></div>\n        <md-button class=\"md-icon-button\" ng-click=\"vm.del" + this.config.model + "($event)\">\n            <md-icon>delete</md-icon>\n        </md-button>\n    </md-data-table-toolbar>\n\n    <md-data-table-toolbar ng-show=\"vm.dtOption.showFilter&&!vm.selected" + pluralModel + "List.length\">\n\n        <md-button class=\"md-icon-button\">\n            <md-icon>search</md-icon>\n        </md-button>\n\n        <md-input-container flex>\n            <input type=\"search\" ng-model=\"vm.dtOption.filter\" placeholder=\"Type search query\"/>\n        </md-input-container>\n\n        <md-button class=\"md-icon-button\" ng-click=\"vm.dtOption.showFilter=false\">\n            <md-icon>clear</md-icon>\n        </md-button>\n\n    </md-data-table-toolbar>";
    };
    MaterialListGen.prototype.createContent = function () {
        var pluralModel = Util_1.Util.plural(this.config.model), pluralInstance = _.camelCase(pluralModel), modelInstanceName = _.camelCase(this.config.model), model = ModelGen_1.ModelGen.getModel(this.config.model), schema = model['schema'], fields = schema.getFields(), headerCode = "<th>row</th>", rowCode = "<td>{{$index + 1 + (vm.dtOption.page - 1 ) * vm.dtOption.limit }}</td>";
        Object.keys(fields).forEach(function (fieldName) {
            var properties = fields[fieldName].properties;
            switch (properties.type) {
                case Field_1.FieldType.String:
                case Field_1.FieldType.Text:
                case Field_1.FieldType.Tel:
                case Field_1.FieldType.EMail:
                case Field_1.FieldType.URL:
                case Field_1.FieldType.Number:
                case Field_1.FieldType.Integer:
                case Field_1.FieldType.Float:
                    headerCode += "<th>" + fieldName + "</th>";
                    rowCode += "<td>{{" + modelInstanceName + "." + fieldName + "}}</td>";
                    break;
                case Field_1.FieldType.Timestamp:
                    headerCode += "<th>" + fieldName + "</th>";
                    rowCode += "<td>{{" + modelInstanceName + "." + fieldName + " | dateTime}}</td>";
                    break;
                case Field_1.FieldType.Boolean:
                    headerCode += "<th>" + fieldName + "</th>";
                    rowCode += "<td>{{" + modelInstanceName + "." + fieldName + "?'Yes':'No'}}</td>";
                    break;
                case Field_1.FieldType.Enum:
                    headerCode += "<th>" + fieldName + "</th>";
                    rowCode += "<td>{{vm." + _.capitalize(fieldName) + "[" + modelInstanceName + "." + fieldName + "]}}</td>";
                    break;
                case Field_1.FieldType.File:
                case Field_1.FieldType.Password:
                case Field_1.FieldType.Object:
                    break;
            }
        });
        return "\n    <md-data-table-container>\n        <table md-data-table md-row-select=\"vm.selected" + pluralModel + "List\">\n\n            <thead md-order=\"vm.dtOption.order\">\n            <tr>\n                " + headerCode + "\n                <th>&nbsp;</th>\n            </tr>\n            </thead>\n            <tbody>\n            <tr md-auto-select\n                ng-repeat=\"" + modelInstanceName + " in vm." + pluralInstance + "List  | filter:vm.dtOption.filter | pagination:vm.dtOption.page:vm.dtOption.limit:vm.dtOption.total:vm.dtOption.loadMore track by $index\">\n                " + rowCode + "\n                <td>\n                    <md-button class=\"md-icon-button\" ng-click=\"vm.edit" + this.config.model + "($event, " + modelInstanceName + ".id)\">\n                        <md-icon>mode_edit</md-icon>\n                    </md-button>\n                </td>\n            </tr>\n            </tbody>\n        </table>\n    </md-data-table-container>";
    };
    MaterialListGen.prototype.getPaginator = function () {
        return "\n    <md-table-pagination md-limit=\"vm.dtOption.limit\"\n                              md-page=\"vm.dtOption.page\"\n                              md-total=\"{{vm.dtOption.total}}\"\n                              md-trigger=\"vm.dtOption.onPaginationChange\"\n                              md-row-select=\"vm.dtOption.rowsPerPage\"\n                              md-label=\"vm.dtOption.label\">\n    </md-table-pagination>";
    };
    return MaterialListGen;
}());
exports.MaterialListGen = MaterialListGen;
