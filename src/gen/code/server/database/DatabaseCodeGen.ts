export abstract class DatabaseCodeGen {

    abstract getInitCode(): string;

    abstract getQueryCode(isSingle: boolean): string;

    abstract getInsertCode(): string;

    abstract getUpdateCode(): string;

    abstract getDeleteCode(): string;
}
