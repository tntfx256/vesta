"use strict";
/**
 *
 * Handles the relationship between models. The driver decides how to implement the physical database
 *
 * type     One to One, One to Many, Many to May
 * type     The related model
 * isWeek   For noSQL databases, if the related model is a new collection, treat it as a nested document
 */
var Relationship = (function () {
    function Relationship(relationType) {
        this.isWeek = false;
        this.type = relationType;
    }
    Relationship.prototype.relatedModel = function (model) {
        this.model = model;
        return this;
    };
    Relationship.Type = {
        One2One: 1,
        One2Many: 2,
        Many2Many: 3
    };
    return Relationship;
}());
exports.Relationship = Relationship;
var FieldType = (function () {
    function FieldType() {
    }
    FieldType.String = 'string';
    FieldType.Text = 'text';
    FieldType.Password = 'password';
    FieldType.Tel = 'tel';
    FieldType.EMail = 'email';
    FieldType.URL = 'url';
    FieldType.Number = 'number';
    FieldType.Integer = 'integer';
    FieldType.Float = 'float';
    FieldType.File = 'file';
    FieldType.Timestamp = 'timestamp';
    FieldType.Boolean = 'boolean';
    FieldType.Object = 'object';
    FieldType.Enum = 'enum';
    FieldType.Relation = 'relation';
    return FieldType;
}());
exports.FieldType = FieldType;
var Field = (function () {
    function Field(fieldName) {
        this._properties = {};
        this._fieldName = fieldName;
        this._properties.enum = [];
        this._properties.fileType = [];
    }
    Object.defineProperty(Field.prototype, "fieldName", {
        get: function () {
            return this._fieldName;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Field.prototype, "properties", {
        get: function () {
            return this._properties;
        },
        enumerable: true,
        configurable: true
    });
    Field.prototype.required = function () {
        this._properties.required = true;
        return this;
    };
    Field.prototype.type = function (type) {
        this._properties.type = type;
        return this;
    };
    Field.prototype.pattern = function (pattern) {
        this._properties.pattern = pattern;
        return this;
    };
    Field.prototype.minLength = function (minLength) {
        this._properties.minLength = +minLength;
        return this;
    };
    Field.prototype.maxLength = function (maxLength) {
        this._properties.maxLength = +maxLength;
        return this;
    };
    Field.prototype.min = function (min) {
        this._properties.min = +min;
        return this;
    };
    Field.prototype.max = function (max) {
        this._properties.max = +max;
        return this;
    };
    Field.prototype.assert = function (cb) {
        this._properties.assert = cb;
        return this;
    };
    Field.prototype.enum = function () {
        var values = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            values[_i - 0] = arguments[_i];
        }
        this._properties.enum = values;
        return this;
    };
    Field.prototype.default = function (value) {
        this._properties.default = value;
        return this;
    };
    Field.prototype.unique = function (isUnique) {
        if (isUnique === void 0) { isUnique = true; }
        this._properties.unique = isUnique;
        return this;
    };
    Field.prototype.primary = function (isPrimary) {
        if (isPrimary === void 0) { isPrimary = true; }
        this._properties.primary = isPrimary;
        this._properties.type = FieldType.String;
        return this;
    };
    Field.prototype.maxSize = function (sizeInKB) {
        this._properties.maxSize = sizeInKB;
        return this;
    };
    Field.prototype.fileType = function () {
        var fileTypes = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            fileTypes[_i - 0] = arguments[_i];
        }
        this._properties.fileType = fileTypes;
        return this;
    };
    Field.prototype.multilingual = function () {
        this._properties.multilingual = true;
        return this;
    };
    Field.prototype.setRelation = function (type, model) {
        this._properties.relation = new Relationship(type);
        this._properties.relation.relatedModel(model);
        return this;
    };
    /**
     *  for one to one relationship
     */
    Field.prototype.isPartOf = function (model) {
        return this.setRelation(Relationship.Type.One2One, model);
    };
    /**
     *  for one to many relationship
     */
    Field.prototype.isOneOf = function (model) {
        return this.setRelation(Relationship.Type.One2Many, model);
    };
    /**
     *  for many to many relationship
     */
    Field.prototype.areManyOf = function (model) {
        return this.setRelation(Relationship.Type.Many2Many, model);
    };
    return Field;
}());
exports.Field = Field;
