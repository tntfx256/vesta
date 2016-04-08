"use strict";
var DatabaseGen = (function () {
    function DatabaseGen() {
    }
    DatabaseGen.getDatabaseType = function (dbName) {
        switch (dbName) {
            case DatabaseGen.Mongodb:
                return { 'import': '{Db}', from: 'mongodb', type: 'Db' };
            case DatabaseGen.MySQL:
                return { 'import': '* as orm', from: 'orm', type: 'orm.ORM' };
        }
        return {};
    };
    DatabaseGen.Mongodb = 'mongodb';
    DatabaseGen.Redis = 'redis';
    DatabaseGen.MySQL = 'mysql';
    DatabaseGen.None = 'No Database';
    return DatabaseGen;
}());
exports.DatabaseGen = DatabaseGen;
