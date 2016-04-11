export interface IDatabaseInfo {
    'import': string;
    from: string;
    type: string;
}

export class DatabaseGen {
    static Mongodb = 'mongodb';
    static Redis = 'redis';
    static MySQL = 'mysql';
}
