"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require('lodash');
var BaseFormGen_1 = require("./BaseFormGen");
var XMLGen_1 = require("../../../../core/XMLGen");
var MaterialFormGen = (function (_super) {
    __extends(MaterialFormGen, _super);
    function MaterialFormGen() {
        _super.apply(this, arguments);
    }
    MaterialFormGen.getInputContainer = function (title) {
        var wrapper = new XMLGen_1.XMLGen('md-input-container');
        wrapper.addClass('md-block');
        if (title) {
            var label = new XMLGen_1.XMLGen('label');
            label.text(title).setAttribute('for', title);
            wrapper.append(label);
        }
        return wrapper;
    };
    MaterialFormGen.prototype.genSelectField = function (wrapper, options) {
        var select = new XMLGen_1.XMLGen('md-select');
        options.forEach(function (item) {
            select.append(new XMLGen_1.XMLGen('md-option').setAttribute('ng-value', item).text(item));
        });
        return select;
    };
    MaterialFormGen.prototype.genElementForField = function (field) {
        var wrapper = MaterialFormGen.getInputContainer(field.fieldName);
        this.getElementsByFieldType(wrapper, field.fieldName, field.properties);
        return wrapper;
    };
    MaterialFormGen.prototype.wrap = function (config) {
        var modelInstanceName = _.camelCase(this.schema.name), modelClassName = _.capitalize(modelInstanceName), wrapper = new XMLGen_1.XMLGen(config.isModal ? 'md-dialog' : 'div'), form = new XMLGen_1.XMLGen('form');
        wrapper.setAttribute('aria-label', config.title);
        form.setAttribute('name', "vm." + modelInstanceName + "Form")
            .setAttribute('ng-submit', "vm." + config.type + modelClassName + "()")
            .setAttribute('novalidate')
            .appendTo(wrapper);
        if (config.isModal) {
            var toolbar = new XMLGen_1.XMLGen('md-toolbar'), actionBar = new XMLGen_1.XMLGen('div'), contentWrapper = new XMLGen_1.XMLGen('md-dialog-content');
            toolbar.html("\n            <div class=\"md-toolbar-tools\">\n                <h3 class=\"box-title\">" + config.title + "</h3>\n\n                <div flex></div>\n                <md-button type=\"button\" class=\"md-icon-button\" ng-click=\"vm.closeFormModal()\">\n                    <md-icon>clear</md-icon>\n                </md-button>\n            </div>");
            contentWrapper.html("\n            <div ng-include=\"'" + config.formPath + "'\"></div>");
            actionBar
                .addClass('md-actions')
                .setAttribute('layout', 'row')
                .html("\n            <md-button type=\"submit\" class=\"md-primary md-raised\">" + config.ok + "</md-button>\n            <md-button type=\"button\" class=\"md-primary\" ng-click=\"vm.closeFormModal()\">" + config.cancel + "</md-button>");
            form.append(toolbar, contentWrapper, actionBar);
        }
        else {
            var contentWrapper = new XMLGen_1.XMLGen('div');
            contentWrapper.setAttribute('ng-include', "'" + config.formPath + "'")
                .appendTo(form);
        }
        return wrapper;
    };
    return MaterialFormGen;
}(BaseFormGen_1.BaseFormGen));
exports.MaterialFormGen = MaterialFormGen;
