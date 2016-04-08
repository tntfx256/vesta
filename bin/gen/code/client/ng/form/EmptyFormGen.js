"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var BaseFormGen_1 = require("./BaseFormGen");
var XMLGen_1 = require("../../../../core/XMLGen");
var EmptyFormGen = (function (_super) {
    __extends(EmptyFormGen, _super);
    function EmptyFormGen() {
        _super.apply(this, arguments);
    }
    EmptyFormGen.prototype.genElementForField = function (field) {
        var wrapper = new XMLGen_1.XMLGen('div');
        this.getElementsByFieldType(wrapper, field.fieldName, field.properties);
        return wrapper;
    };
    EmptyFormGen.prototype.wrap = function (config) {
        var wrapper = new XMLGen_1.XMLGen(config.isModal ? 'md-dialog' : 'div'), form = new XMLGen_1.XMLGen('form');
        wrapper.setAttribute('aria-label', config.title);
        form.setAttribute('name', "vm.sampleForm")
            .setAttribute('ng-submit', "vm." + config.type + "Sample()")
            .setAttribute('novalidate')
            .appendTo(wrapper);
        var contentWrapper = new XMLGen_1.XMLGen('div');
        contentWrapper.setAttribute('ng-include', "'" + config.formPath + "'").appendTo(form);
        return wrapper;
    };
    return EmptyFormGen;
}(BaseFormGen_1.BaseFormGen));
exports.EmptyFormGen = EmptyFormGen;
