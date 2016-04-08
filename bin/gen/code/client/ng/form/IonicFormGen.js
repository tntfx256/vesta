"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require('lodash');
var BaseFormGen_1 = require("./BaseFormGen");
var XMLGen_1 = require("../../../../core/XMLGen");
var IonicFormGen = (function (_super) {
    __extends(IonicFormGen, _super);
    function IonicFormGen() {
        _super.apply(this, arguments);
    }
    IonicFormGen.prototype.genSelectField = function (wrapper, options) {
        wrapper.addClass('item-select');
        var select = new XMLGen_1.XMLGen('select');
        options.forEach(function (item) {
            select.append(new XMLGen_1.XMLGen('option').setAttribute('value', item).text(item));
        });
        return select;
    };
    IonicFormGen.getInputContainer = function (title) {
        var wrapper = new XMLGen_1.XMLGen('label');
        wrapper.addClass('item item-input item-floating-label');
        if (title) {
            var label = new XMLGen_1.XMLGen('span');
            label.text(title).addClass('input-label');
            wrapper.append(label);
        }
        return wrapper;
    };
    IonicFormGen.prototype.genElementForField = function (field) {
        var wrapper = IonicFormGen.getInputContainer(field.fieldName);
        this.getElementsByFieldType(wrapper, field.fieldName, field.properties);
        return wrapper;
    };
    IonicFormGen.prototype.wrap = function (config) {
        var modelInstanceName = _.camelCase(this.schema.name), modelClassName = _.capitalize(modelInstanceName), wrapper = new XMLGen_1.XMLGen(config.isModal ? 'ion-modal-view' : 'div'), form = new XMLGen_1.XMLGen('form');
        form.setAttribute('name', "vm." + modelInstanceName + "Form")
            .setAttribute('ng-submit', "vm." + config.type + modelClassName + "()")
            .setAttribute('novalidate')
            .appendTo(wrapper);
        if (config.isModal) {
            var toolbar = new XMLGen_1.XMLGen('ion-header-bar'), actionBar = new XMLGen_1.XMLGen('div'), contentWrapper = new XMLGen_1.XMLGen('ion-content');
            toolbar.html("\n            <h1 class=\"title\">" + config.title + "</h1>\n            ");
            contentWrapper.html("\n            <div ng-include=\"'" + config.formPath + "'\"></div>");
            actionBar.html("\n            <button type=\"submit\" class=\"button button-positive\">" + config.ok + "</button>\n            <button type=\"button\" class=\"button button-light\" ng-click=\"vm.closeFormModal()\">" + config.cancel + "</button>");
            form.append(toolbar, contentWrapper, actionBar);
        }
        else {
            wrapper.addClass('list');
            var contentWrapper = new XMLGen_1.XMLGen('div');
            contentWrapper.setAttribute('ng-include', "'" + config.formPath + "'")
                .appendTo(form);
        }
        return wrapper;
    };
    return IonicFormGen;
}(BaseFormGen_1.BaseFormGen));
exports.IonicFormGen = IonicFormGen;
