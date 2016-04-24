"use strict";
var DatabaseCodeGen = (function () {
    function DatabaseCodeGen(model) {
        this.model = model;
    }
    DatabaseCodeGen.prototype.getQueryCodeForSingleInstance = function () {
        return this.model + ".findById<IUser>(req.params.id)\n            .then(result=> res.json(result))\n            .catch(err=> this.handleError(res, err.message, Err.Code.DBQuery));";
    };
    DatabaseCodeGen.prototype.getQueryCodeForMultiInstance = function () {
        return "var query = new Vql('" + this.model + "');\n        query.filter(req.param('query')).limit(+req.param('limit', 50));\n        " + this.model + ".findByQuery(query)\n            .then(result=>res.json(result))\n            .catch(err=>this.handleError(res, err.message, Err.Code.DBQuery));";
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
