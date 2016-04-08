"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var Model_1 = require('../Model');
var Field_1 = require('../Field');
var Schema_1 = require('../Schema');
(function (UserGender) {
    UserGender[UserGender["Male"] = 1] = "Male";
    UserGender[UserGender["Female"] = 2] = "Female";
})(exports.UserGender || (exports.UserGender = {}));
var UserGender = exports.UserGender;
var schema = new Schema_1.Schema('User');
schema.addField('id').type(Field_1.FieldType.String).primary();
schema.addField('firstName').type(Field_1.FieldType.String).minLength(2).required();
schema.addField('lastName').type(Field_1.FieldType.String).minLength(2).required();
schema.addField('email').type(Field_1.FieldType.EMail).unique().required();
schema.addField('password').type(Field_1.FieldType.Password).required().minLength(4);
schema.addField('birthDate').type(Field_1.FieldType.Timestamp).required();
schema.addField('gender').type(Field_1.FieldType.Enum).enum(UserGender.Male, UserGender.Female).default(UserGender.Male);
schema.addField('image').type(Field_1.FieldType.File).maxSize(6144).fileType('image/png', 'image/jpeg', 'image/pjpeg');
var User = (function (_super) {
    __extends(User, _super);
    function User(values) {
        _super.call(this, schema);
        this.setValues(values);
    }
    User.schema = schema;
    return User;
}(Model_1.Model));
exports.User = User;
