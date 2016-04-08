"use strict";
var _ = require('lodash');
var Field_1 = require("../../../../../cmn/Field");
var XMLGen_1 = require("../../../../core/XMLGen");
var BaseFormGen = (function () {
    function BaseFormGen(model) {
        this.model = model;
        if (model) {
            this.schema = model['schema'];
            this.fields = this.schema.getFields();
        }
    }
    BaseFormGen.prototype.genTextInputField = function () {
        var input = new XMLGen_1.XMLGen('input', true);
        input.setAttribute('type', 'text');
        return input;
    };
    BaseFormGen.prototype.genTextField = function () {
        var input = new XMLGen_1.XMLGen('textarea');
        return input;
    };
    BaseFormGen.prototype.genTypedInputField = function (type) {
        var input = new XMLGen_1.XMLGen('input', true);
        input.setAttribute('type', type).setAttribute('dir', 'ltr');
        return input;
    };
    BaseFormGen.prototype.genNumberInputField = function (isFloat) {
        if (isFloat === void 0) { isFloat = false; }
        var input = new XMLGen_1.XMLGen('input', true);
        input.setAttribute('type', 'number').setAttribute('dir', 'ltr');
        input.setAttribute('step', isFloat ? 1 : 0.1);
        return input;
    };
    BaseFormGen.prototype.genFileField = function (fileType) {
        var input = new XMLGen_1.XMLGen('input', true);
        input.setAttribute('type', 'file').setAttribute('file-upload');
        if (fileType.length) {
            input.setAttribute('accept', fileType.join(','));
        }
        return input;
    };
    BaseFormGen.prototype.genDateTimeField = function () {
        var input = new XMLGen_1.XMLGen('input', true);
        input.setAttribute('dir', 'ltr').setAttribute('date-input');
        return input;
    };
    BaseFormGen.prototype.genCheckboxField = function () {
        var input = new XMLGen_1.XMLGen('input', true);
        input.setAttribute('type', 'checkbox');
        return input;
    };
    BaseFormGen.prototype.genSelectField = function (wrapper, options) {
        var select = new XMLGen_1.XMLGen('select');
        options.forEach(function (item) {
            select.append(new XMLGen_1.XMLGen('option').setAttribute('value', item).text(item));
        });
        return select;
    };
    BaseFormGen.prototype.getElementsByFieldType = function (wrapper, name, properties) {
        var modelInstanceName = _.camelCase(this.schema.name), formName = modelInstanceName + "Form", input = new XMLGen_1.XMLGen('input', true), ngMessages = [];
        switch (properties.type) {
            case Field_1.FieldType.String:
                input = this.genTextInputField();
                break;
            case Field_1.FieldType.Text:
                input = this.genTextField();
                break;
            case Field_1.FieldType.Password:
                input = this.genTextField();
                break;
            case Field_1.FieldType.Tel:
            case Field_1.FieldType.EMail:
            case Field_1.FieldType.URL:
                this.genTypedInputField(properties.type);
                ngMessages.push(new XMLGen_1.XMLGen('div').setAttribute('ng-message', properties.type).text("Invalid " + properties.type));
                break;
            case Field_1.FieldType.Float:
            case Field_1.FieldType.Number:
            case Field_1.FieldType.Integer:
                input = this.genNumberInputField(properties.type == Field_1.FieldType.Float);
                break;
            case Field_1.FieldType.File:
                input = this.genFileField(properties.fileType);
                break;
            case Field_1.FieldType.Timestamp:
                input = this.genDateTimeField();
                ngMessages.push(new XMLGen_1.XMLGen('div').setAttribute('ng-message', 'date').text("Invalid date"));
                break;
            case Field_1.FieldType.Boolean:
                input = this.genCheckboxField();
                break;
            case Field_1.FieldType.Enum:
                input = this.genSelectField(wrapper, properties.enum);
                ngMessages.push(new XMLGen_1.XMLGen('div').setAttribute('ng-message', 'enum').text("Value must be one of the list items"));
                break;
        }
        input.setAttribute('name', name);
        input.setAttribute('ng-model', "vm." + modelInstanceName + "." + name).setAttribute('id', name);
        wrapper.append(input);
        if (properties.required) {
            input.setAttribute('required');
            ngMessages.push(new XMLGen_1.XMLGen('div').setAttribute('ng-message', 'required').text('This field is required'));
        }
        if (properties.unique) {
            ngMessages.push(new XMLGen_1.XMLGen('div').setAttribute('ng-message', 'unique').text('Duplicate Entry'));
        }
        if (properties.min) {
            input.setAttribute('min', properties.min);
            ngMessages.push(new XMLGen_1.XMLGen('div').setAttribute('ng-message', 'min').text("Value must be greater than " + properties.min));
        }
        if (properties.max) {
            input.setAttribute('max', properties.max);
            ngMessages.push(new XMLGen_1.XMLGen('div').setAttribute('ng-message', 'max').text("Value must be less than " + properties.max));
        }
        if (properties.minLength) {
            input.setAttribute('minlength', properties.minLength);
            ngMessages.push(new XMLGen_1.XMLGen('div').setAttribute('ng-message', 'minLength').text("Characters must be longer than " + properties.minLength));
        }
        if (properties.maxLength) {
            input.setAttribute('maxlength', properties.maxLength);
            ngMessages.push(new XMLGen_1.XMLGen('div').setAttribute('ng-message', 'maxLength').text("Characters must be longer than " + properties.maxLength));
        }
        if (properties.fileType && properties.fileType.length) {
            input.setAttribute('accept', properties.fileType.join(','));
            ngMessages.push(new XMLGen_1.XMLGen('div').setAttribute('ng-message', 'fileType').text("File type is not supported"));
        }
        if (properties.maxSize) {
            ngMessages.push(new XMLGen_1.XMLGen('div').setAttribute('ng-message', 'maxSize').text("File size should be less than " + properties.maxSize + " KB"));
        }
        if (ngMessages.length) {
            var ngMessageWrapper = new XMLGen_1.XMLGen('div');
            ngMessageWrapper.setAttribute('ng-messages', "vm." + formName + "." + name + ".$dirty && vm." + formName + "." + name + ".$error");
            ngMessageWrapper.append.apply(ngMessageWrapper, ngMessages);
            wrapper.append(ngMessageWrapper);
        }
    };
    BaseFormGen.prototype.generate = function () {
        var _this = this;
        var fields = Object.keys(this.fields), codes = [];
        fields.forEach(function (fieldName) {
            var elm = _this.genElementForField(_this.fields[fieldName]);
            //this.elements.push(elm);
            codes.push(elm.generate());
        });
        return codes.join('\n');
    };
    return BaseFormGen;
}());
exports.BaseFormGen = BaseFormGen;
