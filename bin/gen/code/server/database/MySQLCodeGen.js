"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require('lodash');
var DatabaseCodeGen_1 = require("./DatabaseCodeGen");
var MySQLCodeGen = (function (_super) {
    __extends(MySQLCodeGen, _super);
    function MySQLCodeGen(model) {
        _super.call(this);
        this.model = model;
    }
    MySQLCodeGen.prototype.getInitCode = function () {
        return "this." + this.model + "Model = this.database.models['" + this.model + "'];";
    };
    MySQLCodeGen.prototype.getQueryCode = function (isSingle) {
        var instanceName = _.camelCase(this.model);
        return isSingle ? "var result: IQueryResult<I" + this.model + "> = <IQueryResult<I" + this.model + ">>{};\n        this." + this.model + "Model.one({id: req.params.id}, (err: Error, instance: orm.Instance) => {\n            if (err) {\n                result.error = new DatabaseError(Err.Code.DBQuery);\n                result.error.debug = err;\n                return next(res.json(result));\n            }\n            result.items = [];\n            if (instance) {\n                var " + instanceName + " = new " + this.model + "(instance);\n                result.items.push(<I" + this.model + ">" + instanceName + ".getValues());\n            }\n            res.json(result);\n        })" :
            "var result: IQueryResult<I" + this.model + "> = <IQueryResult<I" + this.model + ">>{},\n            limit = req.body.limit ? +req.body.limit : 50;\n        this." + this.model + "Model.find(limit, (err: Error, instances: Array<orm.Instance>) => {\n            if (err) {\n                result.error = new DatabaseError(Err.Code.DBQuery);\n                result.error.debug = err;\n                return next(res.json(result));\n            }\n            var " + instanceName + " = new " + this.model + "();\n            result.items = [];\n            for (var i = 0, il = instances.length; i < il; ++i) {\n                result.items.push(<I" + this.model + ">" + instanceName + ".getValues(instances[i]));\n            }\n            res.json(result);\n        })";
    };
    MySQLCodeGen.prototype.getInsertCode = function () {
        var modelInstanceName = _.camelCase(this.model);
        return "var " + modelInstanceName + " = new " + this.model + "(req.body." + modelInstanceName + "),\n            result: IUpsertResult<I" + this.model + "> = <IUpsertResult<I" + this.model + ">>{},\n            validationError = " + modelInstanceName + ".validate();\n        if (validationError) {\n            result.error = new ValidationError(validationError);\n            return next(res.json(result));\n        }\n        this." + this.model + "Model.create(" + modelInstanceName + ".getValues(), (err: Error, instance: orm.Instance) => {\n            if (err) {\n                result.error = new DatabaseError(Err.Code.DBInsert);\n                result.error.debug = err;\n                return next(res.json(result));\n            }\n            " + modelInstanceName + " = new " + this.model + "(instance);\n            result.items = [<I" + this.model + ">" + modelInstanceName + ".getValues()];\n            return res.json(result);\n        })";
    };
    MySQLCodeGen.prototype.getUpdateCode = function () {
        var modelInstanceName = _.camelCase(this.model);
        return "var " + modelInstanceName + " = new " + this.model + "(req.body." + modelInstanceName + "),\n            result: IUpsertResult<I" + this.model + "> = <IUpsertResult<I" + this.model + ">>{},\n            validationError = " + modelInstanceName + ".validate();\n        if (validationError) {\n            result.error = new ValidationError(validationError);\n            return next(res.json(result));\n        }\n        this." + this.model + "Model.get(" + modelInstanceName + ".id, (err: Error, instance) => {\n            if (err) {\n                result.error = new DatabaseError(Err.Code.DBQuery);\n                result.error.debug = err;\n                return next(res.json(result));\n            }\n            var updatedValues = " + modelInstanceName + ".getValues();\n            for(var fieldName in updatedValues){\n                if(updatedValues.hasOwnProperty(fieldName)) {\n                    instance[fieldName] = updatedValues[fieldName];\n                }\n            }\n            instance.save(function (err) {\n                if (err) {\n                    result.error = new DatabaseError(Err.Code.DBUpdate);\n                    result.error.debug = err;\n                    return next(res.json(result));\n                }\n                result.items = [<I" + this.model + ">" + modelInstanceName + ".getValues()];\n                return res.json(result);\n            })\n        })";
    };
    MySQLCodeGen.prototype.getDeleteCode = function () {
        var modelInstanceName = _.camelCase(this.model);
        return "var result: IDeleteResult = <IDeleteResult>{},\n            id = req.body.id;\n        this." + this.model + "Model.find({id: id}).remove((err: Error) => {\n            if (err) {\n                result.error = new DatabaseError(Err.Code.DBDelete);\n                    result.error.debug = err;\n                    return next(res.json(result));\n            }\n            result.items = [id];\n            return res.json(result);\n        })";
    };
    return MySQLCodeGen;
}(DatabaseCodeGen_1.DatabaseCodeGen));
exports.MySQLCodeGen = MySQLCodeGen;
