"use strict";
var DatabaseCodeGen = (function () {
    function DatabaseCodeGen() {
    }
    DatabaseCodeGen.prototype.getQueryCodeForSingleInstance = function () {
        return "var result:IQueryResult<IUser> = <IQueryResult<IUser>>{items: []};\n        User.findById<IUser>(req.params.id)\n            .then(user=> {\n                result.items.push(user);\n                res.json(result);\n            })\n            .catch(err=>this.handleError(res, err.message, Err.Code.DBQuery));";
    };
    DatabaseCodeGen.prototype.getQueryCodeForMultiInstance = function () {
        return "var result:IQueryResult<IUser> = <IQueryResult<IUser>>{items: []};\n        User.findById<IUser>(req.params.id)\n            .then(user=> {\n                result.items.push(user);\n                res.json(result);\n            })\n            .catch(err=>this.handleError(res, err.message, Err.Code.DBQuery));";
    };
    DatabaseCodeGen.prototype.getQueryCode = function (isSingle) {
        return isSingle ? this.getQueryCodeForSingleInstance() : this.getQueryCodeForMultiInstance();
    };
    DatabaseCodeGen.prototype.getInsertCode = function () {
        return '';
    };
    DatabaseCodeGen.prototype.getUpdateCode = function () {
        return '';
    };
    DatabaseCodeGen.prototype.getDeleteCode = function () {
        return '';
    };
    return DatabaseCodeGen;
}());
exports.DatabaseCodeGen = DatabaseCodeGen;
