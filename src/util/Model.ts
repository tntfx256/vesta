import { Err, Field, FieldType, IModel, IModelFields, Schema } from "@vesta/core";
import { execSync } from "child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, unlinkSync } from "fs";
import { camelCase } from "lodash";
import { join } from "path";
import { IModelConfig } from "../gen/ComponentGen";
import { IFieldMeta } from "../gen/FieldGen";
import { Vesta } from "../gen/Vesta";
import { unixPath } from "./FsUtil";
import { Log } from "./Log";
import { pascalCase } from "./StringUtil";

let isModelGenerated = false;

export function parseModel(modelName: string): IModelConfig {
    modelName = pascalCase(modelName);
    const modelFilePath = `${Vesta.directories.model}/${modelName}.ts`;
    if (!existsSync(modelFilePath)) {
        Log.error(`Specified model was not found: '${modelFilePath}'`);
        return null;
    }
    // todo: require model file
    // const modelClassName = pascalCase(modelName.match(/([^\/]+)$/)[1]);
    return {
        className: modelName,
        file: modelFilePath,
        impPath: `${Vesta.directories.model}/${modelName}`,
        instanceName: camelCase(modelName),
        interfaceName: `I${modelName}`,
        module: getModel(modelName),
    };
}

export function getModelsList(): any {
    const modelPath = Vesta.directories.model;
    const modelDirectory = join(process.cwd(), modelPath);
    const models = {};
    try {
        const modelFiles = readdirSync(modelDirectory);
        modelFiles.forEach((modelFile) => {
            const status = statSync(join(modelDirectory, modelFile));
            if (status.isFile()) {
                models[modelFile.substr(0, modelFile.length - 3)] = join(modelDirectory, modelFile);
            } else {
                const dir = modelFile;
                const subModelDirectory = join(modelDirectory, modelFile);
                const subModelFile = readdirSync(subModelDirectory);
                subModelFile.forEach((mFile) => {
                    const modelKey = `${dir}/${mFile.substr(0, mFile.length - 3)}`;
                    models[modelKey] = unixPath(join(subModelDirectory, mFile));
                });

            }
        });
    } catch (e) {
        Log.warning(e.message);
    }
    return models;
}

export function getModel(modelName: string): IModel {
    const relativePath = compileModels();
    // const pathToModel = `${modelName}.js`;
    modelName = pascalCase(modelName);
    let modelFile = join(process.cwd(), relativePath, `${modelName}.js`);
    if (!existsSync(modelFile)) {
        modelFile = join(process.cwd(), relativePath, `models/${modelName}.js`);
        if (!existsSync(modelFile)) {
            Log.error(`${modelName} was not found at: ${modelFile}`);
            return null;
        }
    }
    const module = require(modelFile);
    if (module[modelName]) {
        // caching model
        // modelStorage[modelName] = module[className];
        return module[modelName];
    }
}

export function getFieldsByType(modelName: string, fieldType: FieldType): IModelFields {
    const model = getModel(pascalCase(modelName));
    let fieldsOfType: IModelFields = null;
    if (!model) { return fieldsOfType; }
    const fields: IModelFields = (model.schema as Schema).getFields();
    for (let names = Object.keys(fields), i = 0, il = names.length; i < il; ++i) {
        const field = fields[names[i]];
        if (field.properties.type === fieldType) {
            if (!fieldsOfType) {
                fieldsOfType = {};
            }
            fieldsOfType[names[i]] = field;
        } else if (field.properties.type === FieldType.List && field.properties.list === fieldType) {
            fieldsOfType[names[i]] = field;
        }
    }
    return fieldsOfType;
}

export function getUniqueFieldNameOfRelatedModel(field: Field): string {
    if (!field.properties.relation) {
        throw new Err(Err.Code.NotAllowed, `${field.fieldName} is not of type Relationship`);
    }
    const targetFields = field.properties.relation.model.schema.getFields();
    const names = Object.keys(targetFields);
    let candidate = "name";
    for (let i = names.length; i--;) {
        if (targetFields[names[i]].properties.type === FieldType.String) {
            if (targetFields[names[i]].properties.unique) { return names[i]; }
            candidate = names[i];
        }
    }
    return candidate;
}

export function getFieldForFormSelect(modelName: string) {
    const model = getModel(modelName);
    if (!model) { return null; }
    const fields = model.schema.getFields();
    if ("title" in fields) { return "title"; }
    for (let i = 0, fieldNames = Object.keys(fields), il = fieldNames.length; i < il; ++i) {
        const field = fields[fieldNames[i]];
        if (field.properties.type === FieldType.String) { return fieldNames[i]; }
    }
    return null;
}

export function getFieldMeta(modelName: string, fieldName: string): IFieldMeta {
    modelName = pascalCase(modelName);
    const model = getModel(modelName);
    if (!model) { return null; }
    // const source = readFileSync(`${Vesta.directories.model}/${modelName}`, { encoding: "utf8" });
    const field = model.schema.getField(fieldName);
    if (!field) { return null; }
    const tsModelFile = `${Vesta.directories.model}/${modelName}.ts`;
    const source = readFileSync(tsModelFile, "utf8");
    let meta: IFieldMeta = { form: true, list: true };
    const fieldStartIndex = source.indexOf(`schema.addField("${fieldName}")`);
    switch (field.properties.type) {
        case FieldType.Enum:
            const enumStartIndex = source.indexOf(".enum(", fieldStartIndex) + 6;
            const enumEndIndex = source.indexOf(")", enumStartIndex);
            const options = source.substring(enumStartIndex, enumEndIndex).split(",")
                .map((str) => str.replace(/\s+/g, ""));
            meta.enum = { options };
            // find enum path
            const enumName = options[0].split(".")[0];
            const enumImportRegex = new RegExp(`import.+${enumName}.+"([^"]+)";`);
            const enumImportResult = enumImportRegex.exec(source);
            if (enumImportResult) {
                // todo check
                meta.enum.path = enumImportResult[1];
            }
            break;
        case FieldType.Relation:
            meta.relation = { model: field.properties.relation.model.schema.name };
            // find path
            const relImportRegex = new RegExp(`import.+${meta.relation.model}.+"([^"]+)";`, "i");
            const relImportResult = relImportRegex.exec(source);
            if (relImportResult) {
                const relPath = relImportResult[1].replace(meta.relation.model, "");
                if (relPath !== "./") {
                    meta.relation.path = relPath;
                }
            }
            break;
    }
    const regExp = new RegExp(`@${fieldName}\\(([^\\)]+)\\)`, "i");
    const json = source.match(regExp);
    if (json) {
        try {
            const parsedMeta: IFieldMeta = JSON.parse(json[1]);
            meta = Object.assign(meta, parsedMeta);
        } catch (e) {
            Log.error(`Error parsing model meta for '${modelName}'\n${json[1]}\n`);
        }
    }
    return meta;
}

export function getConfidentialFields(modelName: string): string[] {
    const model = getModel(modelName);
    if (!model) { return []; }
    const confidentials = [];
    const fields = model.schema.getFields();
    const fieldsNames = Object.keys(fields);
    for (let i = fieldsNames.length; i--;) {
        const meta: IFieldMeta = getFieldMeta(modelName, fieldsNames[i]);
        if (meta.confidential) {
            confidentials.push(fieldsNames[i]);
        }
    }
    return confidentials;
}

export function getOwnerVerifiedFields(modelName: string): string[] {
    const model = getModel(modelName);
    if (!model) { return []; }
    const confidentials = [];
    const fields = model.schema.getFields();
    const fieldsNames = Object.keys(fields);
    for (let i = fieldsNames.length; i--;) {
        const meta: IFieldMeta = getFieldMeta(modelName, fieldsNames[i]);
        if (meta.verifyOwner) {
            confidentials.push(fieldsNames[i]);
        }
    }
    return confidentials;
}

function compileModels() {
    const targetPath = `${Vesta.directories.vesta}/tmp/models`;
    const tsConfigPath = `tsconfig.model.json`;
    const tsConfig = `
{
    "compilerOptions": {
        "module": "commonjs",
        "target": "es6",
        "outDir": "${Vesta.directories.vesta}/tmp/models",
    },
    "include": [
        "${Vesta.directories.model}/**/*.ts"
    ],
}
    `;

    if (!isModelGenerated) {
        writeFileSync(tsConfigPath, tsConfig, { encoding: "utf8" });
        try {
            isModelGenerated = true;
            execSync(`npx tsc -p ${tsConfigPath}`, { cwd: process.cwd() });
        } catch (error) {
            Log.error(`${error.message}\n${error.stdout.toString()}`);
        } finally {
            unlinkSync(tsConfigPath);
        }
    }
    return targetPath;
}
