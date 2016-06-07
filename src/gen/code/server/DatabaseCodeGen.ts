import * as _ from "lodash";

export class DatabaseCodeGen {

    constructor(private model:string) {
    }

    private getQueryCodeForSingleInstance():string {
        return `${this.model}.findById<I${this.model}>(req.params.id)
            .then(result=> res.json(result))
            .catch(err=> this.handleError(res, Err.Code.DBQuery, err.message));`;
    }

    private getQueryCodeForMultiInstance():string {
        return `var query = new Vql('${this.model}');
        query.filter(req.query.query).limitTo(Math.max(+req.query.limit || 50, 50));
        ${this.model}.findByQuery(query)
            .then(result=>res.json(result))
            .catch(err=>this.handleError(res, Err.Code.DBQuery, err.message));`;
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
            .catch(err=> this.handleError(res, Err.Code.DBInsert, err.message));`;
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
                if (result.items.length == 1) return ${modelInstanceName}.update().then(result=>res.json(result));
                this.handleError(res, Err.Code.DBUpdate);
            })
            .catch(err=> this.handleError(res, Err.Code.DBUpdate, err.message));`;
    }

    public getDeleteCode():string {
        var modelInstanceName = _.camelCase(this.model);
        return `var ${modelInstanceName} = new ${this.model}({id: req.body.id});
        ${modelInstanceName}.delete()
            .then(result=> res.json(result))
            .catch(err=> this.handleError(res, Err.Code.DBDelete, err.message));`;
    }
}
