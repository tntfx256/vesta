export interface IDatabaseInfo {
    'import': string;
    from: string;
    type: string;
}

export class DatabaseGen {
    static Mongodb = 'mongodb';
    static Redis = 'redis';
    static MySQL = 'mysql';
    static None = 'No Database';

    static getDatabaseType(dbName): IDatabaseInfo {
        switch (dbName) {
            case DatabaseGen.Mongodb:
                return {'import': '{Db}', from: 'mongodb', type: 'Db'};
            case DatabaseGen.MySQL:
                return {'import': '* as orm', from: 'orm', type: 'orm.ORM'};
        }
        return <IDatabaseInfo>{};
    }
}
