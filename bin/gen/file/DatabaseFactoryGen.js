"use strict";
var ClassGen_1 = require("../core/ClassGen");
var DatabaseGen_1 = require("../core/DatabaseGen");
var TSFileGen_1 = require("../core/TSFileGen");
var DatabaseFactoryGen = (function () {
    function DatabaseFactoryGen() {
        this.factoryFile = new TSFileGen_1.TsFileGen('DatabaseFactory');
        this.factoryClass = this.factoryFile.addClass();
        this.factoryFile.addImport('{setting}', '../config/setting');
        var getInstanceMethod = this.factoryClass.addMethod('getInstance', ClassGen_1.ClassGen.Access.Public, true);
        getInstanceMethod.addParameter({ name: 'config' });
        getInstanceMethod.addParameter({ name: 'callback', type: 'Function' });
    }
    DatabaseFactoryGen.prototype.addDBSupport = function (dbName) {
        if (dbName == DatabaseGen_1.DatabaseGen.Mongodb) {
            this.factoryFile.addImport('{Db, MongoClient}', 'mongodb');
            this.factoryClass.addProperty({
                name: 'mongodbInstance',
                type: 'Db',
                access: ClassGen_1.ClassGen.Access.Private,
                isStatic: true
            });
        }
        else if (dbName == DatabaseGen_1.DatabaseGen.Redis) {
            this.factoryFile.addImport('{RedisClient, createClient}', 'redis');
            this.factoryClass.addProperty({
                name: 'redisInstance',
                type: 'RedisClient',
                access: ClassGen_1.ClassGen.Access.Private,
                isStatic: true
            });
        }
        else if (dbName == DatabaseGen_1.DatabaseGen.MySQL) {
            this.factoryFile.addReference('///<reference path="../../../node_modules/orm/lib/TypeScript/orm.d.ts"/>');
            this.factoryFile.addImport('* as orm', 'orm');
            this.factoryFile.addImport('{ModelOptions}', 'orm');
            this.factoryFile.addImport('{models, defineRelations}', '../api/v1/models');
            this.factoryClass.addProperty({
                name: 'mysqlInstance',
                type: 'orm.ORM',
                access: ClassGen_1.ClassGen.Access.Private,
                isStatic: true
            });
        }
        this.addDbSingleton(dbName);
    };
    DatabaseFactoryGen.prototype.addDbSingleton = function (dbName) {
        var getInstanceMethod = this.factoryClass.getMethod('getInstance');
        getInstanceMethod.appendContent("if (config.protocol == '" + dbName + "') {\n            return DatabaseFactory." + dbName + "Singleton(config, callback);\n        }");
        var singletonMethod = this.factoryClass.addMethod(dbName + 'Singleton', ClassGen_1.ClassGen.Access.Private, true);
        singletonMethod.addParameter({ name: 'config' });
        singletonMethod.addParameter({ name: 'callback', type: 'Function' });
        var code = "if (DatabaseFactory." + dbName + "Instance) {\n            return setTimeout(() => {\n                callback(null, DatabaseFactory." + dbName + "Instance);\n            }, 1);\n        }";
        code += this[dbName + 'Connection']();
        singletonMethod.setContent(code);
    };
    DatabaseFactoryGen.prototype.mongodbConnection = function () {
        return "\n        var url = config.protocol + '://' + config.host + ':' + config.port + '/' + config.database;\n        MongoClient.connect(url, function (err, db) {\n            DatabaseFactory.mongodbInstance = db;\n            callback(err, db);\n        });\n        ";
    };
    DatabaseFactoryGen.prototype.redisConnection = function () {
        return "\n        var client = createClient(config.port, config.host);\n        client.on('error', function (error) {\n            console.log('Redis Error', error);\n        });\n        client.on('ready', function () {\n            console.log('Redis connection established');\n        });\n        client.on('reconnecting', function () {\n            console.log('Redis connection established');\n        });\n        DatabaseFactory.redisInstance = client;\n        callback(null, client);";
    };
    DatabaseFactoryGen.prototype.mysqlConnection = function () {
        var mysqlSetup = this.factoryClass.addMethod('setup', ClassGen_1.ClassGen.Access.Public, true);
        mysqlSetup.addParameter({ name: 'sync', type: 'boolean' });
        mysqlSetup.addParameter({ name: 'callback', type: 'Function' });
        mysqlSetup.setContent("var instances: Array<orm.Model> = [],\n            modelNames = Object.keys(models),\n            connection = DatabaseFactory.mysqlInstance;\n        for (var i = 0; i < modelNames.length; i++) {\n            var dbSchema = models[modelNames[i]].schema.dbSchema;\n            instances[modelNames[i]] = connection.define(models[modelNames[i]].schema.name, dbSchema, <orm.ModelOptions>{cache: false});\n        }\n\n        defineRelations(instances);\n        if (sync) {\n            return DatabaseFactory.mysqlInstance.drop(function () {\n                DatabaseFactory.mysqlInstance.sync(function () {\n                    callback(null, DatabaseFactory.mysqlInstance);\n                });\n            });\n        }\n        callback(null, DatabaseFactory.mysqlInstance);");
        return "\n        orm.connect(config, function (err, db) {\n            if (err) {\n                return err\n            }\n            db.settings['instance.returnAllErrors'] = true;\n            DatabaseFactory.mysqlInstance = db;\n            callback(err, DatabaseFactory.mysqlInstance);\n        });\n        ";
    };
    DatabaseFactoryGen.prototype.generate = function () {
        return this.factoryFile.generate();
    };
    return DatabaseFactoryGen;
}());
exports.DatabaseFactoryGen = DatabaseFactoryGen;
