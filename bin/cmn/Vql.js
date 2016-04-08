"use strict";
/**
 * It has two main category
 *  - comparison (`isConnector` = false): it compares a field with a value
 *      The comparison operator is a above  10
 *      Attention: The value for comparison might be another field e.g. model.fieldA > model.fieldC
 *  - conjunction (`isConnector` = false):: it connects two or more comparison by logical operators (AND, OR)
 *      The conjunction operator is a number below 10
 *
 * The data structure is a tree and each internal node is of type `Condition.Operator`. The values a
 */
var Condition = (function () {
    function Condition(operator) {
        this.children = [];
        this.isConnector = false;
        this.operator = operator;
        this.isConnector = operator < 10;
    }
    /**
     *
     * If the operator is of type comparison
     */
    Condition.prototype.compare = function (field, value, isValueOfTypeField) {
        if (isValueOfTypeField === void 0) { isValueOfTypeField = false; }
        if (this.isConnector)
            return this;
        this.comparison = { field: field, value: value, isValueOfTypeField: isValueOfTypeField };
        return this;
    };
    Condition.prototype.append = function (child) {
        if (!this.isConnector)
            return this;
        this.children.push(child);
        return this;
    };
    Condition.prototype.traverse = function (cb) {
        cb(this);
        for (var i = 0, il = this.children.length; i < il; ++i) {
            var child = this.children[i];
            child.isConnector ? child.traverse(cb) : cb(child);
        }
    };
    Condition.prototype.negateChildren = function () {
        for (var i = 0, il = this.children.length; i < il; ++i) {
            this.children[i].negate();
        }
    };
    Condition.prototype.negate = function () {
        switch (this.operator) {
            // Connectors
            case Condition.Operator.And:
                this.operator = Condition.Operator.Or;
                this.negateChildren();
                break;
            case Condition.Operator.Or:
                this.operator = Condition.Operator.And;
                this.negateChildren();
                break;
            // Comparison
            case Condition.Operator.EqualTo:
                this.operator = Condition.Operator.NotEqualTo;
                break;
            case Condition.Operator.NotEqualTo:
                this.operator = Condition.Operator.EqualTo;
                break;
            case Condition.Operator.GreaterThan:
                this.operator = Condition.Operator.LessThanOrEqualTo;
                break;
            case Condition.Operator.GreaterThanOrEqualTo:
                this.operator = Condition.Operator.LessThan;
                break;
            case Condition.Operator.LessThan:
                this.operator = Condition.Operator.GreaterThanOrEqualTo;
                break;
            case Condition.Operator.LessThanOrEqualTo:
                this.operator = Condition.Operator.GreaterThan;
                break;
            case Condition.Operator.Like:
                this.operator = Condition.Operator.NotLike;
                break;
            case Condition.Operator.NotLike:
                this.operator = Condition.Operator.Like;
                break;
        }
    };
    Condition.Operator = {
        Or: 1,
        And: 2,
        EqualTo: 11,
        NotEqualTo: 12,
        GreaterThan: 13,
        GreaterThanOrEqualTo: 14,
        LessThan: 15,
        LessThanOrEqualTo: 16,
        Like: 17,
        NotLike: 18
    };
    return Condition;
}());
exports.Condition = Condition;
var Vql = (function () {
    function Vql(model) {
        // IQueryOption
        this.fetchLimit = 0;
        this.fetchFrom = 0;
        this.sort = [];
        this.fields = [];
        this.relations = [];
        this.model = model;
    }
    Vql.prototype.filter = function (filter) {
        var condition = new Condition(Condition.Operator.And);
        for (var field in filter) {
            if (filter.hasOwnProperty(field)) {
                var cmp = new Condition(Condition.Operator.EqualTo);
                cmp.compare(field, filter[field]);
                condition.append(cmp);
            }
        }
        return this;
    };
    Vql.prototype.select = function () {
        var fields = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            fields[_i - 0] = arguments[_i];
        }
        this.fields = fields;
        return this;
    };
    Vql.prototype.limit = function (limit) {
        if (limit === void 0) { limit = 1; }
        this.fetchLimit = limit;
        return this;
    };
    Vql.prototype.offset = function (offset) {
        this.fetchFrom = offset;
        return this;
    };
    Vql.prototype.orderBy = function (field, ascending) {
        if (ascending === void 0) { ascending = true; }
        for (var i = this.orderBy.length; i--;) {
            if (this.orderBy[i].field == field) {
                this.orderBy[i] = { field: field, ascending: ascending };
                return this;
            }
        }
        this.sort.push({ field: field, ascending: ascending });
        return this;
    };
    Vql.prototype.fetchRecordFor = function (field) {
        if (this.relations.indexOf(field) < 0) {
            this.relations.push(field);
        }
        return this;
    };
    Vql.prototype.where = function (condition) {
        this.condition = condition;
        return this;
    };
    return Vql;
}());
exports.Vql = Vql;
