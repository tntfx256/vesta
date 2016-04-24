export class DatabaseCodeGen {

    constructor(private model:string) {
    }

    private getQueryCodeForSingleInstance():string {
        return `${this.model}.findById<IUser>(req.params.id)
            .then(result=> res.json(result))
            .catch(err=> this.handleError(res, err.message, Err.Code.DBQuery));`;
    }

    private getQueryCodeForMultiInstance():string {
        return `var query = new Vql('${this.model}');
        query.filter(req.param('query')).limit(+req.param('limit', 50));
        ${this.model}.findByQuery(query)
            .then(result=>res.json(result))
            .catch(err=>this.handleError(res, err.message, Err.Code.DBQuery));`;
    }

    public getQueryCode(isSingle:boolean):string {
        return isSingle ? this.getQueryCodeForSingleInstance() : this.getQueryCodeForMultiInstance();
    }

    public getInsertCode():string {
        return '';
    }

    public getUpdateCode():string {
        return '';
    }

    public getDeleteCode():string {
        return '';
    }
}
