"use strict";
var DatabaseGen = (function () {
    function DatabaseGen() {
    }
    DatabaseGen.Mongodb = 'mongodb';
    DatabaseGen.Redis = 'redis';
    DatabaseGen.MySQL = 'mysql';
    return DatabaseGen;
}());
exports.DatabaseGen = DatabaseGen;
