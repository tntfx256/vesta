"use strict";
var Err_1 = require("./Err");
/**
 * Abstract Database class for drivers
 */
var Database = (function () {
    function Database() {
    }
    Database.getInstance = function (config) {
        return Promise.reject(new Err_1.Err(Err_1.Err.Code.Implementation));
    };
    Database.MySQL = 'mysql';
    Database.Mongodb = 'mongo';
    Database.Redis = 'redis';
    return Database;
}());
exports.Database = Database;
