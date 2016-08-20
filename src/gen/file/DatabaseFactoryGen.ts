import {ClassGen} from "../core/ClassGen";
import {DatabaseGen} from "../core/DatabaseGen";
import {IFileGenerator} from "../core/IFileGenerator";
import {TsFileGen} from "../core/TSFileGen";

export class DatabaseFactoryGen implements IFileGenerator {

    private factoryClass: ClassGen;
    private factoryFile: TsFileGen;

    constructor() {
        this.factoryFile = new TsFileGen('DatabaseFactory');
        this.factoryClass = this.factoryFile.addClass();
        this.factoryFile.addImport('{setting}', '../config/setting');
        var getInstanceMethod = this.factoryClass.addMethod('getInstance', ClassGen.Access.Public, true);
        getInstanceMethod.addParameter({name: 'config'});
        getInstanceMethod.addParameter({name: 'callback', type: 'Function'});
    }

    public addDBSupport(dbName) {
        if (dbName == DatabaseGen.Mongodb) {
            this.factoryFile.addImport('{Db, MongoClient}', 'mongodb');
            this.factoryClass.addProperty({
                name: 'mongodbInstance',
                type: 'Db',
                access: ClassGen.Access.Private,
                isStatic: true
            });
        } else if (dbName == DatabaseGen.Redis) {
            this.factoryFile.addImport('{RedisClient, createClient}', 'redis');
            this.factoryClass.addProperty({
                name: 'redisInstance',
                type: 'RedisClient',
                access: ClassGen.Access.Private,
                isStatic: true
            });
        } else if (dbName == DatabaseGen.MySQL) {
            this.factoryFile.addReference('///<reference path="../../../node_modules/orm/lib/TypeScript/orm.d.ts"/>');
            this.factoryFile.addImport('* as orm', 'orm');
            this.factoryFile.addImport('{ModelOptions}', 'orm');
            this.factoryFile.addImport('{models, defineRelations}', '../api/v1/models');
            this.factoryClass.addProperty({
                name: 'mysqlInstance',
                type: 'orm.ORM',
                access: ClassGen.Access.Private,
                isStatic: true
            });
        }
        this.addDbSingleton(dbName);
    }

    private addDbSingleton(dbName) {
        var getInstanceMethod = this.factoryClass.getMethod('getInstance');
        getInstanceMethod.appendContent(`if (config.protocol == '${dbName}') {
            return DatabaseFactory.${dbName}Singleton(config, callback);
        }`);
        var singletonMethod = this.factoryClass.addMethod(dbName + 'Singleton', ClassGen.Access.Private, true);
        singletonMethod.addParameter({name: 'config'});
        singletonMethod.addParameter({name: 'callback', type: 'Function'});
        var code = `if (DatabaseFactory.${dbName}Instance) {
            return setTimeout(() => {
                callback(null, DatabaseFactory.${dbName}Instance);
            }, 1);
        }`;
        code += this[dbName + 'Connection']();
        singletonMethod.setContent(code);
    }

    private mongodbConnection() {
        return `
        var url = config.protocol + '://' + config.host + ':' + config.port + '/' + config.database;
        MongoClient.connect(url, function (err, db) {
            DatabaseFactory.mongodbInstance = db;
            callback(err, db);
        });
        `
    }

    private redisConnection() {
        return `
        var client = createClient(config.port, config.host);
        client.on('error', function (error) {
            console.log('Redis Error', error);
        });
        client.on('ready', function () {
            console.log('Redis connection established');
        });
        client.on('reconnecting', function () {
            console.log('Redis connection established');
        });
        DatabaseFactory.redisInstance = client;
        callback(null, client);`
    }

    private mysqlConnection() {
        var mysqlSetup = this.factoryClass.addMethod('setup', ClassGen.Access.Public, true);
        mysqlSetup.addParameter({name: 'sync', type: 'boolean'});
        mysqlSetup.addParameter({name: 'callback', type: 'Function'});
        mysqlSetup.setContent(`var instances: Array<orm.Model> = [],
            modelNames = Object.keys(models),
            connection = DatabaseFactory.mysqlInstance;
        for (var i = 0; i < modelNames.length; i++) {
            var dbSchema = models[modelNames[i]].schema.dbSchema;
            instances[modelNames[i]] = connection.define(models[modelNames[i]].schema.name, dbSchema, <orm.ModelOptions>{cache: false});
        }

        defineRelations(instances);
        if (sync) {
            return DatabaseFactory.mysqlInstance.drop(function () {
                DatabaseFactory.mysqlInstance.sync(function () {
                    callback(null, DatabaseFactory.mysqlInstance);
                });
            });
        }
        callback(null, DatabaseFactory.mysqlInstance);`);
        return `
        orm.connect(config, function (err, db) {
            if (err) {
                return err
            }
            db.settings['instance.returnAllErrors'] = true;
            DatabaseFactory.mysqlInstance = db;
            callback(err, DatabaseFactory.mysqlInstance);
        });
        `

    }

    generate(): string {
        return this.factoryFile.generate();
    }
}
