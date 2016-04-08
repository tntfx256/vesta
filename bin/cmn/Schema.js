"use strict";
var Field_1 = require('./Field');
var Schema = (function () {
    function Schema(modelName) {
        this.modelName = modelName;
        this.fields = {};
        this.fieldsName = [];
    }
    Schema.prototype.getFields = function () {
        return this.fields;
    };
    Schema.prototype.getFieldsNames = function () {
        return this.fieldsName;
    };
    Object.defineProperty(Schema.prototype, "name", {
        get: function () {
            return this.modelName;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Schema.prototype, "validateSchema", {
        get: function () {
            if (!this._validateSchema) {
                this._validateSchema = getValidatorSchema(this.fields);
            }
            return this._validateSchema;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Schema.prototype, "dbSchema", {
        get: function () {
            if (!this._dbSchema) {
                this._dbSchema = getDbSchema(this.fields);
            }
            return this._dbSchema;
        },
        enumerable: true,
        configurable: true
    });
    Schema.prototype.addField = function (fieldName) {
        this.fields = this.fields || {};
        this.fields[fieldName] = new Field_1.Field(fieldName);
        this.fieldsName.push(fieldName);
        return this.fields[fieldName];
    };
    return Schema;
}());
exports.Schema = Schema;
/**
 *
 * @param {IModelFields} fields  {fieldName: Field}
 * @returns {IValidationModelSet}
 */
function getValidatorSchema(fields) {
    var getFieldSchema = function (properties) {
        var fieldSchema = {};
        for (var property in properties) {
            if (properties.hasOwnProperty(property)) {
                if (['fileType', 'enum'].indexOf(property) >= 0) {
                    if (properties[property].length) {
                        fieldSchema[property] = properties[property];
                    }
                    continue;
                }
                fieldSchema[property] = properties[property];
            }
        }
        return fieldSchema;
    };
    var schema = {};
    for (var field in fields) {
        if (fields.hasOwnProperty(field)) {
            schema[field] = getFieldSchema(fields[field].properties);
        }
    }
    return schema;
}
/**
 *  db field types
 *  text, number, integer, boolean, date, enum, object, point, binary, serial
 *  db field type properties
 *  all -> defaultValue: string, unique:bool, required:bool
 *  text -> size:int, big:bool
 *  date -> time:bool,
 *  number -> size:int, unsigned:bool
 *  enum -> values:array
 */
function getDbSchema(fields) {
    var getFieldSchema = function (properties) {
        var fieldSchema = {};
        if (properties.unique) {
            fieldSchema.unique = true;
        }
        //if (properties.required) {
        fieldSchema.required = false;
        //}
        if (properties.default) {
            fieldSchema.defaultValue = properties.default;
        }
        if (properties.maxLength) {
            fieldSchema.size = properties.default;
        }
        //
        switch (properties.type) {
            case Field_1.FieldType.String:
            case Field_1.FieldType.Password:
            case Field_1.FieldType.Tel:
            case Field_1.FieldType.EMail:
            case Field_1.FieldType.URL:
            case Field_1.FieldType.File:
            case Field_1.FieldType.Text:
                fieldSchema.type = 'text';
                break;
            case Field_1.FieldType.Integer:
                fieldSchema.type = 'integer';
                break;
            case Field_1.FieldType.Number:
            case Field_1.FieldType.Float:
                fieldSchema.type = 'number';
                break;
            //case FieldType.Date:
            //case FieldType.DateTime:
            case Field_1.FieldType.Timestamp:
                fieldSchema.type = 'integer';
                break;
            case Field_1.FieldType.Boolean:
                fieldSchema.type = 'boolean';
                break;
            case Field_1.FieldType.Object:
                fieldSchema.type = 'object';
                break;
            case Field_1.FieldType.Enum:
                fieldSchema.type = 'integer';
                fieldSchema.defaultValue = properties.default || properties.enum[0];
                break;
        }
        //
        if (properties.primary) {
            fieldSchema.type = 'serial';
            fieldSchema.key = true;
        }
        return fieldSchema;
    };
    var schema = {};
    for (var field in fields) {
        if (fields.hasOwnProperty(field)) {
            schema[field] = getFieldSchema(fields[field].properties);
        }
    }
    return schema;
}
