import * as _ from "lodash";

export class DatabaseCodeGen {

    constructor(private model:string) {
    }

    private getQueryCodeForSingleInstance():string {
        return `${this.model}.findById<I${this.model}>(req.params.id)
            .then(result=> res.json(result))
            .catch(reason=> this.handleError(res, Err.Code.DBQuery, reason.error.message));`;
    }

    private getQueryCodeForMultiInstance():string {
        return `var query = new Vql(${this.model}.schema.name);
        query.filter(req.query.query).limitTo(Math.min(+req.query.limit || 50, 50)).fromPage(+req.query.page || 1);
        ${this.model}.findByQuery(query)
            .then(result=>res.json(result))
            .catch(reason=>this.handleError(res, Err.Code.DBQuery, reason.error.message));`;
    }

    public getQueryCode(isSingle:boolean):string {
        return isSingle ? this.getQueryCodeForSingleInstance() : this.getQueryCodeForMultiInstance();
    }

    public getInsertCode():string {
        var modelInstanceName = _.camelCase(this.model);
        return `var ${modelInstanceName} = new ${this.model}(req.body),
            validationError = ${modelInstanceName}.validate();
        if (validationError) {
            var result:IUpsertResult<I${this.model}> = <IUpsertResult<I${this.model}>>{};
            result.error = new ValidationError(validationError);
            return res.json(result);
        }
        ${modelInstanceName}.insert<I${this.model}>()
            .then(result=> res.json(result))
            .catch(reason=> this.handleError(res, Err.Code.DBInsert, reason.error.message));`;
    }

    public getUpdateCode():string {
        var modelInstanceName = _.camelCase(this.model);
        return `var ${modelInstanceName} = new ${this.model}(req.body),
            validationError = ${modelInstanceName}.validate();
        if (validationError) {
            var result:IUpsertResult<I${this.model}> = <IUpsertResult<I${this.model}>>{};
            result.error = new ValidationError(validationError);
            return res.json(result);
        }
        ${this.model}.findById<I${this.model}>(${modelInstanceName}.id)
            .then(result=> {
                if (result.items.length == 1) return ${modelInstanceName}.update<I${this.model}>().then(result=>res.json(result));
                this.handleError(res, Err.Code.DBUpdate);
            })
            .catch(reason=> this.handleError(res, Err.Code.DBUpdate, reason.error.message));`;
    }

    public getDeleteCode():string {
        var modelInstanceName = _.camelCase(this.model);
        return `var ${modelInstanceName} = new ${this.model}({id: req.body.id});
        ${modelInstanceName}.delete()
            .then(result=> res.json(result))
            .catch(reason=> this.handleError(res, Err.Code.DBDelete, reason.error.message));`;
    }
}
