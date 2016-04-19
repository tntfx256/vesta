"use strict";
var fs = require("fs-extra");
var path = require("path");
var _ = require("lodash");
var inquirer = require("inquirer");
var ClassGen_1 = require("../core/ClassGen");
var Vesta_1 = require("../file/Vesta");
var FieldGen_1 = require("./FieldGen");
var TSFileGen_1 = require("../core/TSFileGen");
var ProjectGen_1 = require("../ProjectGen");
var Fs_1 = require("../../util/Fs");
var Log_1 = require("../../util/Log");
var ModelGen = (function () {
    function ModelGen(args) {
        this.args = args;
        this.path = 'src/cmn/models';
        this.fields = {};
        this.vesta = Vesta_1.Vesta.getInstance();
        var modelName = _.capitalize(_.camelCase(args[0]));
        this.modelFile = new TSFileGen_1.TsFileGen(modelName);
        this.modelInterface = this.modelFile.addInterface();
        this.modelClass = this.modelFile.addClass();
        this.modelClass.setParentClass('Model');
        this.modelClass.addImplements(this.modelInterface.name);
        this.modelFile.addImport('{Model}', '../Model');
        this.modelFile.addImport('{FieldType}', '../Field');
        this.modelFile.addImport('{Schema}', '../Schema');
        var cm = this.modelClass.setConstructor();
        cm.addParameter({ name: 'values', type: 'any', isOptional: true });
        cm.setContent("super(schema);\n        this.setValues(values);");
        this.modelFile.addMixin("var schema = new Schema('" + modelName + "');", TSFileGen_1.TsFileGen.CodeLocation.AfterEnum);
        this.modelClass.addProperty({
            name: 'schema',
            type: 'Schema',
            access: ClassGen_1.ClassGen.Access.Public,
            defaultValue: 'schema',
            isStatic: true
        });
        if (this.vesta.getConfig().type == ProjectGen_1.ProjectGen.Type.ClientSide) {
            this.path = 'src/app/cmn/models';
        }
        Fs_1.Fs.mkdir(this.path);
    }
    ModelGen.prototype.getFields = function () {
        var _this = this;
        var question = {
            name: 'fieldName',
            type: 'input',
            message: 'Field Name: '
        };
        Log_1.Log.success('\n:: New field (press enter with no fieldName to exit)\n');
        var idField = new FieldGen_1.FieldGen(this.modelFile, 'id');
        idField.setAsPrimary();
        this.fields['id'] = idField;
        inquirer.prompt(question, function (answer) {
            if (answer['fieldName']) {
                var fieldName = _.camelCase(answer['fieldName']);
                var field = new FieldGen_1.FieldGen(_this.modelFile, fieldName);
                _this.fields[fieldName] = field;
                field.getProperties(function () {
                    _this.getFields();
                });
            }
            else {
                _this.write();
            }
        });
    };
    ModelGen.prototype.generate = function () {
        this.getFields();
    };
    ModelGen.prototype.write = function () {
        var fieldNames = Object.keys(this.fields);
        for (var i = 0, il = fieldNames.length; i < il; ++i) {
            this.modelFile.addMixin(this.fields[fieldNames[i]].generate(), TSFileGen_1.TsFileGen.CodeLocation.AfterEnum);
            var _a = this.fields[fieldNames[i]].getNameTypePair(), fieldName = _a.fieldName, fieldType = _a.fieldType, interfaceFieldType = _a.interfaceFieldType, defaultValue = _a.defaultValue;
            var property = {
                name: fieldName,
                type: fieldType,
                access: ClassGen_1.ClassGen.Access.Public,
                defaultValue: defaultValue
            };
            this.modelClass.addProperty(property);
            property.type = interfaceFieldType;
            this.modelInterface.addProperty(property);
        }
        Fs_1.Fs.writeFile(path.join(this.path, this.modelFile.name + '.ts'), this.modelFile.generate());
    };
    ModelGen.getModelsList = function () {
        var vesta = Vesta_1.Vesta.getInstance(), config = vesta.getConfig(), modelDirectory = path.join(process.cwd(), config.type == ProjectGen_1.ProjectGen.Type.ServerSide ? 'src/cmn/models' : 'src/app/cmn/models'), models = {};
        try {
            var modelFiles = fs.readdirSync(modelDirectory);
            modelFiles.forEach(function (modelFile) {
                models[modelFile.substr(0, modelFile.length - 3)] = path.join(modelDirectory, modelFile);
            });
        }
        catch (e) {
        }
        return models;
    };
    ModelGen.getModel = function (modelName) {
        var possiblePath = ['build/app/cmn/models/', 'www/app/cmn/models/', 'build/cmn/models/'];
        modelName = _.capitalize(modelName);
        for (var i = possiblePath.length; i--;) {
            var modelFile = path.join(process.cwd(), possiblePath[i], modelName + '.js');
            if (fs.existsSync(modelFile)) {
                var module = require(modelFile);
                if (module[modelName]) {
                    return module[modelName];
                }
            }
        }
        return null;
    };
    return ModelGen;
}());
exports.ModelGen = ModelGen;
