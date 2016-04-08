"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var _ = require('lodash');
var DatabaseCodeGen_1 = require("./DatabaseCodeGen");
// todo change _id -> index
var MongoDBCodeGen = (function (_super) {
    __extends(MongoDBCodeGen, _super);
    function MongoDBCodeGen(model) {
        _super.call(this);
        this.model = model;
    }
    MongoDBCodeGen.prototype.getInitCode = function () {
        return "this." + this.model + "Model = this.database.collection('" + this.model + "');";
    };
    MongoDBCodeGen.prototype.getQueryCode = function (isSingle) {
        var instanceName = _.camelCase(this.model);
        return isSingle ? "var result: IQueryResult<I" + this.model + "> = <IQueryResult<I" + this.model + ">>{};\n        this." + this.model + "Model.findOne({_id: new ObjectID(req.params.id)}, (err: Error, instance: any) => {\n            if (err) {\n                result.error = new DatabaseError(Err.Code.DBQuery);\n                result.error.debug = err;\n                return next(res.json(result));\n            }\n            result.items = [];\n            if (instance) {\n                var " + instanceName + " = new " + this.model + "(instance);\n                result.items.push(<I" + this.model + ">" + instanceName + ".getValues());\n            }\n            res.json(result);\n        })" :
            "var result: IQueryResult<I" + this.model + "> = <IQueryResult<I" + this.model + ">>{};\n        var cursor: Cursor = this." + this.model + "Model.find();\n        cursor.toArray((err: Error, instances: Array<any>) => {\n            if (err) {\n                result.error = new DatabaseError(Err.Code.DBQuery);\n                result.error.debug = err;\n                return next(res.json(result));\n            }\n            var " + instanceName + " = new " + this.model + "();\n            result.items = [];\n            for (var i = 0, il = instances.length; i < il; ++i) {\n                result.items.push(<I" + this.model + ">" + instanceName + ".getValues(instances[i]));\n            }\n            res.json(result);\n        });";
    };
    MongoDBCodeGen.prototype.getInsertCode = function () {
        var modelInstanceName = _.camelCase(this.model);
        return "var " + modelInstanceName + " = new " + this.model + "(req.body." + modelInstanceName + "),\n            result: IUpsertResult<I" + this.model + "> = <IUpsertResult<I" + this.model + ">>{},\n            validationError = " + modelInstanceName + ".validate();\n        if (validationError) {\n            result.error = new ValidationError(validationError);\n            return res.json(result);\n        }\n        this." + this.model + "Model.insertOne(" + modelInstanceName + ".getValues(), (err: Error, instance: IInsertOneWriteOpResult) => {\n            if (err) {\n                result.error = new DatabaseError(Err.Code.DBQuery);\n                result.error.debug = err;\n                return next(res.json(result));\n            }\n            " + modelInstanceName + " = new " + this.model + "(instance);\n            result.items = [<I" + this.model + ">" + modelInstanceName + ".getValues()];\n            return res.json(result);\n        })";
    };
    MongoDBCodeGen.prototype.getUpdateCode = function () {
        var modelInstanceName = _.camelCase(this.model);
        return "var " + modelInstanceName + " = new " + this.model + "(req.data." + modelInstanceName + "),\n            result: IUpsertResult<I" + this.model + "> = <IUpsertResult<I" + this.model + ">>{},\n            validationError = " + modelInstanceName + ".validate();\n        if (validationError) {\n            result.error = new ValidationError(validationError);\n            return res.json(result);\n        }\n            var updatedValues = " + modelInstanceName + ".getValues();\n        this." + this.model + "Model.findOneAndUpdate({_id: new ObjectID(" + modelInstanceName + ".id)}, updatedValues, (err: Error, instance: IFindAndModifyWriteOpResult) => {\n            if (err) {\n                result.error = new DatabaseError(Err.Code.DBQuery);\n                result.error.debug = err;\n                return next(res.json(result));\n            }\n            result.items = [<I" + this.model + ">" + modelInstanceName + ".getValues()];\n            return res.json(result);\n        })";
    };
    MongoDBCodeGen.prototype.getDeleteCode = function () {
        var modelInstanceName = _.camelCase(this.model);
        return "var result: IDeleteResult = <IDeleteResult>{},\n            id = req.body.id;\n        this." + this.model + "Model.deleteOne({_id: new ObjectID(id)}, (err: Error, qResult: IDeleteWriteOpResult) => {\n            if (err) {\n                result.error = new DatabaseError(Err.Code.DBQuery);\n                result.error.debug = err;\n                return next(res.json(result));\n            }\n            result.items = [id];\n            return res.json(result);\n        })";
    };
    return MongoDBCodeGen;
}(DatabaseCodeGen_1.DatabaseCodeGen));
exports.MongoDBCodeGen = MongoDBCodeGen;
