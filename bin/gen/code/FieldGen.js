"use strict";
var inquirer = require("inquirer");
var _ = require("lodash");
var Field_1 = require("../../cmn/Field");
var Util_1 = require("../../util/Util");
var FileMemeType_1 = require("../../cmn/FileMemeType");
var Vesta_1 = require("../file/Vesta");
var FieldGen = (function () {
    function FieldGen(modelFile, name) {
        this.modelFile = modelFile;
        this.name = name;
        this.isMultilingual = false;
        this.properties = {};
        this.needImport = false;
        this.properties.enum = [];
        this.properties.fileType = [];
        var config = Vesta_1.Vesta.getInstance().getConfig();
    }
    FieldGen.prototype.getProperties = function (callback) {
        var _this = this;
        var question = {
            name: 'fieldType',
            type: 'list',
            message: 'Field Type: ',
            default: Field_1.FieldType.String,
            choices: [
                Field_1.FieldType.String,
                Field_1.FieldType.EMail,
                Field_1.FieldType.Password,
                Field_1.FieldType.Text,
                Field_1.FieldType.Tel,
                Field_1.FieldType.URL,
                new inquirer.Separator(),
                Field_1.FieldType.Number,
                Field_1.FieldType.Integer,
                Field_1.FieldType.Float,
                new inquirer.Separator(),
                Field_1.FieldType.Timestamp,
                Field_1.FieldType.File,
                Field_1.FieldType.Boolean,
                Field_1.FieldType.Object,
                Field_1.FieldType.Enum,
                new inquirer.Separator()
            ]
        };
        inquirer.prompt(question, function (answer) {
            _this.properties.type = answer['fieldType'];
            var questions = _this.getRequiredPropertyQuestionsBasedOnFieldType();
            inquirer.prompt(questions, function (answers) {
                var arr = [];
                for (var property in answers) {
                    if (answers.hasOwnProperty(property)) {
                        if (property == 'enum') {
                            arr = answers[property].split(',');
                            for (var i = arr.length; i--;) {
                                arr[i] = _.trim(arr[i]);
                            }
                            _this.properties.enum = arr;
                        }
                        else if (property == 'fileType') {
                            arr = answers[property].split(',');
                            for (var i = arr.length; i--;) {
                                var meme = [];
                                arr[i] = _.trim(arr[i]);
                                if (arr[i].indexOf('/') > 0) {
                                    if (FileMemeType_1.FileMemeType.isValid(arr[i])) {
                                        meme = [arr[i]];
                                    }
                                }
                                else {
                                    meme = FileMemeType_1.FileMemeType.getMeme(arr[i]);
                                }
                                if (meme.length) {
                                    for (var j = meme.length; j--;) {
                                        if (_this.properties.fileType.indexOf(meme[j]) < 0) {
                                            _this.properties.fileType.push(meme[j]);
                                        }
                                    }
                                }
                                else {
                                    Util_1.Util.log.error("Unknown type " + arr[i]);
                                }
                            }
                        }
                        else {
                            _this.properties[property] = answers[property];
                        }
                    }
                }
                callback();
            });
        });
    };
    FieldGen.prototype.setAsPrimary = function () {
        this.properties.primary = true;
    };
    FieldGen.prototype.getRequiredPropertyQuestionsBasedOnFieldType = function () {
        var askForDefaultValue = false, qs = [
            { name: 'required', type: 'confirm', message: 'Is Required: ', default: false }
        ];
        switch (this.properties.type) {
            case Field_1.FieldType.String:
                qs.push({ name: 'unique', type: 'confirm', message: 'Is Unique: ', default: false });
            case Field_1.FieldType.Text:
                qs.push({ name: 'minLength', type: 'input', message: 'Min Length: ' });
                qs.push({ name: 'maxLength', type: 'input', message: 'Max Length: ' });
                qs.push({ name: 'multilingual', type: 'confirm', message: 'IS Multilingual: ' });
                break;
            case Field_1.FieldType.Password:
                qs.push({ name: 'minLength', type: 'input', message: 'Min Length: ' });
                break;
            case Field_1.FieldType.Tel:
                qs.push({ name: 'unique', type: 'confirm', message: 'Is Unique: ', default: false });
                break;
            case Field_1.FieldType.EMail:
                qs.push({ name: 'unique', type: 'confirm', message: 'Is Unique: ', default: false });
                break;
            case Field_1.FieldType.URL:
                break;
            case Field_1.FieldType.Number:
            case Field_1.FieldType.Integer:
            case Field_1.FieldType.Float:
                askForDefaultValue = true;
                qs.push({ name: 'min', type: 'input', message: 'Min Value: ' });
                qs.push({ name: 'max', type: 'input', message: 'Max Value: ' });
                break;
            case Field_1.FieldType.File:
                qs.push({ name: 'maxSize', type: 'input', message: 'Max File Size (KB): ' });
                qs.push({ name: 'fileType', type: 'input', message: 'Valid File Extensions: )' });
                break;
            case Field_1.FieldType.Boolean:
                askForDefaultValue = true;
                break;
            case Field_1.FieldType.Object:
                break;
            case Field_1.FieldType.Enum:
                askForDefaultValue = true;
                qs.push({ name: 'enum', type: 'input', message: 'Valid Options: ' });
                break;
        }
        if (askForDefaultValue) {
            qs.push({ name: 'default', type: 'input', message: 'Default Value: ' });
        }
        return qs;
    };
    FieldGen.prototype.getCodeForActualFieldType = function () {
        switch (this.properties.type) {
            case Field_1.FieldType.String:
            case Field_1.FieldType.Text:
            case Field_1.FieldType.Password:
            case Field_1.FieldType.Tel:
            case Field_1.FieldType.EMail:
            case Field_1.FieldType.URL:
                return 'string';
            case Field_1.FieldType.Number:
            case Field_1.FieldType.Integer:
            case Field_1.FieldType.Float:
            //case FieldType.Date:
            //case FieldType.DateTime:
            case Field_1.FieldType.Timestamp:
                return 'number';
            case Field_1.FieldType.File:
                return 'File|string';
            case Field_1.FieldType.Boolean:
                return 'boolean';
        }
        if (this.properties.primary)
            return 'number|string';
        return 'any';
    };
    FieldGen.prototype.getCodeForFieldType = function () {
        switch (this.properties.type) {
            case Field_1.FieldType.String:
                return 'FieldType.String';
            case Field_1.FieldType.Text:
                return 'FieldType.Text';
            case Field_1.FieldType.Password:
                return 'FieldType.Password';
            case Field_1.FieldType.Tel:
                return 'FieldType.Tel';
            case Field_1.FieldType.EMail:
                return 'FieldType.EMail';
            case Field_1.FieldType.URL:
                return 'FieldType.URL';
            case Field_1.FieldType.Number:
                return 'FieldType.Number';
            case Field_1.FieldType.Integer:
                return 'FieldType.Integer';
            case Field_1.FieldType.Float:
                return 'FieldType.Float';
            case Field_1.FieldType.File:
                return 'FieldType.File';
            //case FieldType.Date:
            //    return 'FieldType.Date';
            //case FieldType.DateTime:
            //    return 'FieldType.DateTime';
            case Field_1.FieldType.Timestamp:
                return 'FieldType.Timestamp';
            case Field_1.FieldType.Boolean:
                return 'FieldType.Boolean';
            case Field_1.FieldType.Object:
                return 'FieldType.Object';
            case Field_1.FieldType.Enum:
                return 'FieldType.Enum';
        }
        return 'FieldType.String';
    };
    FieldGen.prototype.generate = function () {
        var code = "schema.addField('" + this.name + "').type(" + this.getCodeForFieldType() + ")";
        if (this.properties.required)
            code += '.required()';
        if (this.properties.primary)
            code += '.primary()';
        if (this.properties.unique)
            code += '.unique()';
        if (this.properties.minLength)
            code += ".minLength(" + this.properties.minLength + ")";
        if (this.properties.maxLength)
            code += ".maxLength(" + this.properties.maxLength + ")";
        if (this.properties.min)
            code += ".min(" + this.properties.min + ")";
        if (this.properties.max)
            code += ".max(" + this.properties.max + ")";
        if (this.properties.maxSize)
            code += ".maxSize(" + this.properties.maxSize + ")";
        if (this.properties.fileType.length) {
            code += ".fileType('" + this.properties.fileType.join("', '") + "')";
        }
        if (this.properties.enum.length) {
            var enumArray = [], firstEnum = this.properties.enum[0];
            if (firstEnum.indexOf('.') > 0) {
                this.enumName = firstEnum.substr(0, firstEnum.indexOf('.'));
                this.needImport = true;
                enumArray = this.properties.enum;
            }
            else {
                this.enumName = _.capitalize(this.modelFile.name) + _.capitalize(this.name);
                var enumField = this.modelFile.addEnum(this.enumName);
                enumField.shouldExport(true);
                firstEnum = this.enumName + "." + firstEnum;
                for (var i = 0, il = this.properties.enum.length; i < il; ++i) {
                    enumField.addProperty(this.properties.enum[i]);
                    var v = _.capitalize(this.properties.enum[i]);
                    enumArray.push(this.enumName + "." + v);
                    if (i == 0) {
                        firstEnum = enumArray[0];
                    }
                }
            }
            code += ".enum(" + enumArray.join(", ") + ")";
        }
        if (this.properties.default) {
            if (this.properties.enum.length) {
                code += ".default(" + firstEnum + ")";
            }
            else {
                code += ".default('" + this.properties.default + "')";
            }
        }
        else if (firstEnum) {
            code += ".default(" + firstEnum + ")";
        }
        if (this.needImport) {
            Util_1.Util.log.warning("Do not forget to import the (" + this.enumName + ")");
        }
        return code + ';';
    };
    FieldGen.prototype.getNameTypePair = function () {
        return {
            fieldName: this.name,
            fieldType: (this.properties.type == Field_1.FieldType.Enum ? this.enumName : this.getCodeForActualFieldType()),
            interfaceFieldType: (this.properties.type == Field_1.FieldType.Enum ? 'number' : this.getCodeForActualFieldType()),
            defaultValue: this.getCodeForDefaultFieldValue()
        };
    };
    FieldGen.prototype.getCodeForDefaultFieldValue = function () {
        switch (this.properties.type) {
            case Field_1.FieldType.String:
            case Field_1.FieldType.Text:
            case Field_1.FieldType.Password:
            case Field_1.FieldType.Tel:
            case Field_1.FieldType.EMail:
            case Field_1.FieldType.URL:
            case Field_1.FieldType.Number:
            case Field_1.FieldType.Integer:
            case Field_1.FieldType.Float:
            case Field_1.FieldType.File:
            case Field_1.FieldType.Enum:
            case Field_1.FieldType.Object:
                return undefined;
            //case FieldType.Date:
            //case FieldType.DateTime:
            case Field_1.FieldType.Timestamp:
                return 'Date.now()';
            case Field_1.FieldType.Boolean:
                return 'false';
        }
        return undefined;
    };
    return FieldGen;
}());
exports.FieldGen = FieldGen;
