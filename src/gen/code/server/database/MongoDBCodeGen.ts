import * as _ from 'lodash';
import {DatabaseCodeGen} from "./DatabaseCodeGen";
import {ClassGen} from "../../../core/ClassGen";
// todo change _id -> index
export class MongoDBCodeGen extends DatabaseCodeGen {

    constructor(private model: string) {
        super();
    }

    getInitCode(): string {
        return `this.${this.model}Model = this.database.collection('${this.model}');`;
    }

    getQueryCode(isSingle: boolean) {
        var instanceName = _.camelCase(this.model);
        return isSingle ? `var result: IQueryResult<I${this.model}> = <IQueryResult<I${this.model}>>{};
        this.${this.model}Model.findOne({_id: new ObjectID(req.params.id)}, (err: Error, instance: any) => {
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
            `var result: IQueryResult<I${this.model}> = <IQueryResult<I${this.model}>>{};
        var cursor: Cursor = this.${this.model}Model.find();
        cursor.toArray((err: Error, instances: Array<any>) => {
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
        });`;
    }

    getInsertCode(): string {
        var modelInstanceName = _.camelCase(this.model);
        return `var ${modelInstanceName} = new ${this.model}(req.body.${modelInstanceName}),
            result: IUpsertResult<I${this.model}> = <IUpsertResult<I${this.model}>>{},
            validationError = ${modelInstanceName}.validate();
        if (validationError) {
            result.error = new ValidationError(validationError);
            return res.json(result);
        }
        this.${this.model}Model.insertOne(${modelInstanceName}.getValues(), (err: Error, instance: IInsertOneWriteOpResult) => {
            if (err) {
                result.error = new DatabaseError(Err.Code.DBQuery);
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
        return `var ${modelInstanceName} = new ${this.model}(req.data.${modelInstanceName}),
            result: IUpsertResult<I${this.model}> = <IUpsertResult<I${this.model}>>{},
            validationError = ${modelInstanceName}.validate();
        if (validationError) {
            result.error = new ValidationError(validationError);
            return res.json(result);
        }
            var updatedValues = ${modelInstanceName}.getValues();
        this.${this.model}Model.findOneAndUpdate({_id: new ObjectID(${modelInstanceName}.id)}, updatedValues, (err: Error, instance: IFindAndModifyWriteOpResult) => {
            if (err) {
                result.error = new DatabaseError(Err.Code.DBQuery);
                result.error.debug = err;
                return next(res.json(result));
            }
            result.items = [<I${this.model}>${modelInstanceName}.getValues()];
            return res.json(result);
        })`;
    }

    getDeleteCode() {
        var modelInstanceName = _.camelCase(this.model);
        return `var result: IDeleteResult = <IDeleteResult>{},
            id = req.body.id;
        this.${this.model}Model.deleteOne({_id: new ObjectID(id)}, (err: Error, qResult: IDeleteWriteOpResult) => {
            if (err) {
                result.error = new DatabaseError(Err.Code.DBQuery);
                result.error.debug = err;
                return next(res.json(result));
            }
            result.items = [id];
            return res.json(result);
        })`
    }
}
