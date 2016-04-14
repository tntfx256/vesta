"use strict";
var inquirer = require("inquirer");
var _ = require("lodash");
var Field_1 = require("../../cmn/Field");
var Util_1 = require("../../util/Util");
var FileMemeType_1 = require("../../cmn/FileMemeType");
var Vesta_1 = require("../file/Vesta");
var ModelGen_1 = require("./ModelGen");
var FieldGen = (function () {
    function FieldGen(modelFile, name) {
        this.modelFile = modelFile;
        this.name = name;
        this.isMultilingual = false;
        this.properties = {};
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
                new inquirer.Separator(),
                Field_1.FieldType.Relation,
                new inquirer.Separator()
            ]
        };
        inquirer.prompt(question, function (fieldTypeAnswer) {
            _this.properties.type = fieldTypeAnswer['fieldType'];
            var questions = _this.getRequiredPropertyQuestionsBasedOnFieldType();
            inquirer.prompt(questions, function (answers) {
                var properties = Object.keys(answers);
                for (var i = 0, il = properties.length; i < il; ++i) {
                    var property = properties[i];
                    if (['relatedModel'].indexOf(property) >= 0)
                        continue;
                    if (property == 'enum') {
                        _this.properties.enum = answers[property].split(',').map(function (item) { return _.trim(item); });
                    }
                    else if (property == 'fileType') {
                        _this.properties.fileType = _this.getFileTypes(answers['fileType']);
                    }
                    else if (property == 'relationType') {
                        _this.properties.relation = new Field_1.Relationship(_this.getRelationNumberFromCode(answers[property]));
                        _this.properties.relation.relatedModel(answers['relatedModel']);
                    }
                    else {
                        _this.properties[property] = answers[property];
                    }
                }
                callback();
            });
        });
    };
    FieldGen.prototype.getFileTypes = function (answer) {
        var arr = answer.split(','), fileTypes = [];
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
                    if (fileTypes.indexOf(meme[j]) < 0) {
                        fileTypes.push(meme[j]);
                    }
                }
            }
            else {
                Util_1.Util.log.error("Unknown type " + arr[i]);
            }
        }
        return fileTypes;
    };
    FieldGen.prototype.getRelationCodeFromNumber = function (type, model) {
        switch (type) {
            case Field_1.Relationship.Type.Many2Many:
                return ".areManyOf(" + model + ")";
            case Field_1.Relationship.Type.One2One:
                return ".isPartOf(" + model + ")";
            default:
                return ".isOneOf(" + model + ")";
        }
    };
    FieldGen.prototype.getRelationNumberFromCode = function (type) {
        switch (type) {
            case 'One2One':
                return Field_1.Relationship.Type.One2One;
            case 'Many2Many':
                return Field_1.Relationship.Type.Many2Many;
        }
        return Field_1.Relationship.Type.One2Many;
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
                qs.push({ name: 'minLength', type: 'input', message: 'Min Length: ' });
                qs.push({ name: 'maxLength', type: 'input', message: 'Max Length: ' });
                // qs.push(<Question>{name: 'multilingual', type: 'confirm', message: 'IS Multilingual: '});
                break;
            case Field_1.FieldType.Text:
                // qs.push(<Question>{name: 'multilingual', type: 'confirm', message: 'IS Multilingual: '});
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
                qs.push({ name: 'fileType', type: 'input', message: 'Valid File Extensions: ' });
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
            case Field_1.FieldType.Relation:
                var types = ['One2One', 'One2Many', 'Many2Many'];
                var models = Object.keys(ModelGen_1.ModelGen.getModelsList());
                qs.push({ name: 'relationType', type: 'list', choices: types, message: 'Relation Type: ' });
                qs.push({ name: 'relatedModel', type: 'list', choices: models, message: 'Target Model: ' });
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
            case Field_1.FieldType.Relation:
                var types = "number|I" + this.properties.relation.model + "|" + this.properties.relation.model;
                if (this.properties.relation.type == Field_1.Relationship.Type.Many2Many) {
                    return "Array<" + types + ">";
                }
                return types;
        }
        if (this.properties.primary)
            return 'number|string';
        return 'any';
    };
    FieldGen.prototype.getCodeForFieldType = function () {
        if (this.properties.primary)
            return 'FieldType.Integer';
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
            case Field_1.FieldType.Relation:
                return 'FieldType.Relation';
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
        if (this.properties.fileType.length)
            code += ".fileType('" + this.properties.fileType.join("', '") + "')";
        if (this.properties.enum.length)
            code += this.genCodeForEnumField();
        if (this.properties.default)
            code += ".default('" + this.properties.default + "')";
        if (this.properties.relation) {
            var _a = this.properties.relation, type = _a.type, model = _a.model;
            this.modelFile.addImport("{I" + model + ", " + model + "}", model.toString());
            code += this.getRelationCodeFromNumber(type, model.toString());
        }
        return code + ';';
    };
    FieldGen.prototype.genCodeForEnumField = function () {
        var enumArray = [], firstEnum = this.properties.enum[0];
        if (firstEnum.indexOf('.') > 0) {
            this.enumName = firstEnum.substr(0, firstEnum.indexOf('.'));
            enumArray = this.properties.enum;
            Util_1.Util.log.warning("Do not forget to import the (" + this.enumName + ")");
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
        return ".enum(" + enumArray.join(", ") + ")";
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
