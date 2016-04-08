"use strict";
var DatabaseGen_1 = require("../../../core/DatabaseGen");
var MongoDBCodeGen_1 = require("./MongoDBCodeGen");
var MySQLCodeGen_1 = require("./MySQLCodeGen");
var DatabaseCodeGenFactory = (function () {
    function DatabaseCodeGenFactory() {
    }
    DatabaseCodeGenFactory.create = function (dbName, model) {
        switch (dbName) {
            case DatabaseGen_1.DatabaseGen.MySQL:
                return new MySQLCodeGen_1.MySQLCodeGen(model);
            case DatabaseGen_1.DatabaseGen.Mongodb:
                return new MongoDBCodeGen_1.MongoDBCodeGen(model);
        }
        return null;
    };
    return DatabaseCodeGenFactory;
}());
exports.DatabaseCodeGenFactory = DatabaseCodeGenFactory;
