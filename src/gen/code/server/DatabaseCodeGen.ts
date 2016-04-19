export class DatabaseCodeGen {

    private getQueryCodeForSingleInstance():string {
        return `var result:IQueryResult<IUser> = <IQueryResult<IUser>>{items: []};
        User.findById<IUser>(req.params.id)
            .then(user=> {
                result.items.push(user);
                res.json(result);
            })
            .catch(err=>this.handleError(res, err.message, Err.Code.DBQuery));`;
    }

    private getQueryCodeForMultiInstance():string {
        return `var result:IQueryResult<IUser> = <IQueryResult<IUser>>{items: []};
        User.findById<IUser>(req.params.id)
            .then(user=> {
                result.items.push(user);
                res.json(result);
            })
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
