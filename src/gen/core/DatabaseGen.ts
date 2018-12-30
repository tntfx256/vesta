export interface IDatabaseInfo {
    "import": string;
    from: string;
    type: string;
}

export class DatabaseGen {
    public static Mongodb = "mongodb";
    public static Redis = "redis";
    public static MySQL = "mysql";
}
