import * as _ from 'lodash';
import {DatabaseCodeGen} from "./DatabaseCodeGen";
import {ClassGen} from "../../../core/ClassGen";

export class MySQLCodeGen extends DatabaseCodeGen {

    constructor(private model: string) {
        super();
    }

    getInitCode(): string {
        return `this.${this.model}Model = this.database.models['${this.model}'];`;
    }

    getQueryCode(isSingle: boolean) {
        var instanceName = _.camelCase(this.model);
        return isSingle ? `var result: IQueryResult<I${this.model}> = <IQueryResult<I${this.model}>>{};
        this.${this.model}Model.one({id: req.params.id}, (err: Error, instance: orm.Instance) => {
            if (err) {
                result.error = new DatabaseError(Err.Code.DBQuery);
                result.error.debug = err;
                return next(res.json(result));
            }
            result.items = [];
            if (instance) {
                var ${instanceName} = new ${this.model}(instance);
                result.items.push(<I${this.model}>${instanceName}.getValues());
            }
            res.json(result);
        })` :
            `var result: IQueryResult<I${this.model}> = <IQueryResult<I${this.model}>>{},
            limit = req.body.limit ? +req.body.limit : 50;
        this.${this.model}Model.find(limit, (err: Error, instances: Array<orm.Instance>) => {
            if (err) {
                result.error = new DatabaseError(Err.Code.DBQuery);
                result.error.debug = err;
                return next(res.json(result));
            }
            var ${instanceName} = new ${this.model}();
            result.items = [];
            for (var i = 0, il = instances.length; i < il; ++i) {
                result.items.push(<I${this.model}>${instanceName}.getValues(instances[i]));
            }
            res.json(result);
        })`;
    }

    getInsertCode(): string {
        var modelInstanceName = _.camelCase(this.model);
        return `var ${modelInstanceName} = new ${this.model}(req.body.${modelInstanceName}),
            result: IUpsertResult<I${this.model}> = <IUpsertResult<I${this.model}>>{},
            validationError = ${modelInstanceName}.validate();
        if (validationError) {
            result.error = new ValidationError(validationError);
            return next(res.json(result));
        }
        this.${this.model}Model.create(${modelInstanceName}.getValues(), (err: Error, instance: orm.Instance) => {
            if (err) {
                result.error = new DatabaseError(Err.Code.DBInsert);
                result.error.debug = err;
                return next(res.json(result));
            }
            ${modelInstanceName} = new ${this.model}(instance);
            result.items = [<I${this.model}>${modelInstanceName}.getValues()];
            return res.json(result);
        })`;
    }

    getUpdateCode() {
        var modelInstanceName = _.camelCase(this.model);
        return `var ${modelInstanceName} = new ${this.model}(req.body.${modelInstanceName}),
            result: IUpsertResult<I${this.model}> = <IUpsertResult<I${this.model}>>{},
            validationError = ${modelInstanceName}.validate();
        if (validationError) {
            result.error = new ValidationError(validationError);
            return next(res.json(result));
        }
        this.${this.model}Model.get(${modelInstanceName}.id, (err: Error, instance) => {
            if (err) {
                result.error = new DatabaseError(Err.Code.DBQuery);
                result.error.debug = err;
                return next(res.json(result));
            }
            var updatedValues = ${modelInstanceName}.getValues();
            for(var fieldName in updatedValues){
                if(updatedValues.hasOwnProperty(fieldName)) {
                    instance[fieldName] = updatedValues[fieldName];
                }
            }
            instance.save(function (err) {
                if (err) {
                    result.error = new DatabaseError(Err.Code.DBUpdate);
                    result.error.debug = err;
                    return next(res.json(result));
                }
                result.items = [<I${this.model}>${modelInstanceName}.getValues()];
                return res.json(result);
            })
        })`;
    }

    getDeleteCode() {
        var modelInstanceName = _.camelCase(this.model);
        return `var result: IDeleteResult = <IDeleteResult>{},
            id = req.body.id;
        this.${this.model}Model.find({id: id}).remove((err: Error) => {
            if (err) {
                result.error = new DatabaseError(Err.Code.DBDelete);
                    result.error.debug = err;
                    return next(res.json(result));
            }
            result.items = [id];
            return res.json(result);
        })`
    }
}
