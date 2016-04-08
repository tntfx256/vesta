"use strict";
var Validator_1 = require("./Validator");
var Model = (function () {
    function Model(schema) {
        this._schema = schema;
    }
    Model.prototype.validate = function () {
        var fieldNames = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            fieldNames[_i - 0] = arguments[_i];
        }
        var result = Validator_1.Validator.validate(this.getValues(), this._schema.validateSchema);
        if (!result)
            return result;
        if (fieldNames.length) {
            var subset = {}, hasError = false;
            for (var i = 0, il = fieldNames.length; i < il; ++i) {
                if (!result[fieldNames[i]])
                    continue;
                subset[fieldNames[i]] = result[fieldNames[i]];
                hasError = true;
            }
            return hasError ? subset : null;
        }
        else {
            return result;
        }
    };
    Model.prototype.setValues = function (values) {
        if (!values)
            return;
        var fieldsNames = this._schema.getFieldsNames(), fieldName;
        for (var i = fieldsNames.length; i--;) {
            fieldName = fieldsNames[i];
            this[fieldName] = values[fieldName];
        }
    };
    Model.prototype.getValues = function (collection) {
        if (collection === void 0) { collection = null; }
        var fields = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            fields[_i - 1] = arguments[_i];
        }
        var values = {}, fieldsNames = fields.length ? fields : this._schema.getFieldsNames(), fieldName;
        collection = collection || this;
        for (var i = fieldsNames.length; i--;) {
            fieldName = fieldsNames[i];
            if (collection[fieldName].getValues) {
                values[fieldName] = collection[fieldName].getValues();
            }
            else {
                values[fieldName] = collection[fieldName];
            }
        }
        return values;
    };
    Model.prototype.toJSON = function () {
        return this.getValues();
    };
    Model.prototype.insert = function (values) {
        if (values) {
            this.setValues(values);
        }
        // removing id for insertion
        // todo: set previous id on failure?
        delete this['id'];
        return Model._database.insertOne(this._schema.name, this.getValues());
    };
    Model.prototype.update = function (values) {
        if (values) {
            this.setValues(values);
        }
        return Model._database.updateOne(this._schema.name, this.getValues());
    };
    Model.prototype.delete = function () {
        return Model._database.deleteOne(this._schema.name, this['id']);
    };
    Model.getDatabase = function () {
        return Model._database;
    };
    Model.findById = function (id) {
        return Model._database.findById(this['constructor']['schema'].name, id);
    };
    Model.findByModelValues = function (modelValues, limit) {
        return Model._database.findByModelValues(this['constructor']['schema'].name, modelValues, limit);
    };
    Model.findByQuery = function (query) {
        return Model._database.findByQuery(query);
    };
    Model.updateAll = function (newValues, condition) {
        return Model._database.updateAll(this['constructor']['schema'].name, newValues, condition);
    };
    Model.deleteAll = function (condition) {
        return Model._database.deleteAll(this['constructor']['schema'].name, condition);
    };
    return Model;
}());
exports.Model = Model;
