import {DatabaseCodeGen} from "./DatabaseCodeGen";
import {DatabaseGen} from "../../../core/DatabaseGen";
import {MongoDBCodeGen} from "./MongoDBCodeGen";
import {MySQLCodeGen} from "./MySQLCodeGen";

export class DatabaseCodeGenFactory {

    public static create(dbName: string, model: string): DatabaseCodeGen {
        switch (dbName) {
            case DatabaseGen.MySQL:
                return new MySQLCodeGen(model);
            case DatabaseGen.Mongodb:
                return new MongoDBCodeGen(model);
        }
        return null;
    }
}
