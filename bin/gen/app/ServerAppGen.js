"use strict";
var inqurer = require("inquirer");
var Vesta_1 = require("../file/Vesta");
var DatabaseGen_1 = require("../core/DatabaseGen");
var ExpressAppGen_1 = require("./server/ExpressAppGen");
var GitGen_1 = require("../file/GitGen");
var Util_1 = require("../../util/Util");
var speakeasy = require('speakeasy');
var ServerAppGen = (function () {
    function ServerAppGen(config) {
        this.config = config;
        this.vesta = Vesta_1.Vesta.getInstance();
        this.express = new ExpressAppGen_1.ExpressAppGen(config);
    }
    ServerAppGen.prototype.getBranchName = function () {
        // var branch = 'master';
        // if (this.config.server.database != DatabaseGen.None) {
        //     branch += `-${this.config.server.database}`;
        // }
        return 'master';
    };
    ServerAppGen.prototype.cloneTemplate = function () {
        var dir = this.config.name, repo = this.vesta.getProjectConfig().repository;
        return GitGen_1.GitGen.clone(repo.baseRepoUrl + "/" + repo.group + "/" + repo.express + ".git", dir, this.getBranchName())
            .then(function () { return GitGen_1.GitGen.cleanClonedRepo(dir); })
            .then(function () { return Util_1.Util.fs.copy(dir + "/resources/gitignore/src/config/setting.var.ts", dir + "/src/config/setting.var.ts"); });
    };
    ServerAppGen.prototype.generate = function () {
        return this.cloneTemplate();
    };
    ServerAppGen.getGeneratorConfig = function () {
        var config = { type: 'express' };
        return new Promise(function (resolve) {
            var question = {
                type: 'list',
                name: 'database',
                message: 'Database: ',
                choices: [DatabaseGen_1.DatabaseGen.None, DatabaseGen_1.DatabaseGen.Mongodb, DatabaseGen_1.DatabaseGen.MySQL],
                default: DatabaseGen_1.DatabaseGen.None
            };
            inqurer.prompt(question, function (answer) {
                config.database = answer['database'];
                resolve(config);
            });
        });
    };
    return ServerAppGen;
}());
exports.ServerAppGen = ServerAppGen;
