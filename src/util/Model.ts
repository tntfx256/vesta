import { Err, Field, FieldType, ModelConstructor, Schema } from "@vesta/core";
import { execSync } from "child_process";
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from "fs";
import { camelCase } from "lodash";
import { join } from "path";
import { IModelConfig } from "../gen/ComponentGen";
import { IFieldMeta } from "../gen/FieldGen";
import { Vesta } from "../gen/Vesta";
import { readJsonFile, unixPath } from "./FsUtil";
import { Log } from "./Log";
import { PackageManager } from "./PackageManager";
import { pascalCase } from "./StringUtil";

let isModelGenerated = false;

export function parseModel(modelName: string): IModelConfig | null {
  const fileName = pascalCase(modelName);
  const modelFilePath = `${Vesta.directories.model}/${fileName}.ts`;
  if (!existsSync(modelFilePath)) {
    Log.error(`${modelName} model was not found: '${modelFilePath}'`);
    return null;
  }
  const module = getModel(fileName);
  if (!module) {
    // there might be an error, already logged
    return null;
  }

  return {
    className: module.schema.name,
    file: modelFilePath,
    instanceName: camelCase(module.schema.name),
    interfaceName: `I${module.schema.name}`,
    module,
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

export function getRelationModelName(field: Field) {
  if (field.isOneOf) {
    return field.isOneOf.schema.name;
  }
  if (field.areManyOf) {
    return field.areManyOf.schema.name;
  }
}

export function getFieldsByType(modelName: string, fieldType: FieldType): Field[] {
  const model = parseModel(pascalCase(modelName));
  if (!model) {
    return [];
  }
  let fieldsOfType: Field[] = [];
  const fields: Field[] = (model.module.schema as Schema).getFields();
  for (const field of fields) {
    if (field.type === fieldType) {
      fieldsOfType.push(field);
    }
    // else if (field.type === FieldType.List && field.list === fieldType) {
    //   fieldsOfType[names[i]] = field;
    // }
  }
  return fieldsOfType;
}

export function hasFieldOfType(modelName: string, type: FieldType) {
  return getFieldsByType(modelName, type).length > 0;
}

export function getUniqueFieldNameOfRelatedModel(field: Field): string {
  if (field.type !== FieldType.Relation) {
    throw new Err(Err.Type.NotAllowed, `${field.name as string} is not of type Relationship`);
  }
  const targetFields = field.isOneOf ? field.isOneOf.schema.getFields() : field.areManyOf.schema.getFields();
  let candidate = "name";
  for (let i = 0, il = targetFields.length; i < il; i += 1) {
    if (targetFields[i].type === FieldType.String) {
      if (targetFields[i].unique) {
        return targetFields[i].name as string;
      }
      candidate = targetFields[i].name as string;
    }
  }
  return candidate;
}

export function getFieldForFormSelect(modelName: string): string | null {
  const model = parseModel(modelName);
  if (!model) {
    return null;
  }
  for (const field of model.module.schema.getFields()) {
    if (field.type === FieldType.String) {
      return field.name;
    }
  }
  return null;
}

export function getFieldMeta(modelName: string, fieldName: string): IFieldMeta | null {
  modelName = pascalCase(modelName);
  const model = parseModel(modelName);
  if (!model) {
    return null;
  }
  const field = model.module.schema.getField(fieldName);
  if (!field) {
    return null;
  }
  const tsModelFile = `${Vesta.directories.model}/${modelName}.ts`;
  const source = readFileSync(tsModelFile, "utf8");
  let meta: IFieldMeta = { form: true, list: true };
  const enumRegex = new RegExp(`${fieldName}:.+enum:.+\\[([^\\]]+)\\]`, "im");

  // field type based meta
  switch (field.type) {
    case FieldType.Enum:
      const enumResult = enumRegex.exec(source);
      if (!enumResult) {
        Log.warning(`Failed to extract enum options for ${fieldName}`);
        break;
      }
      const options = enumResult[1].replace(/\s*,\s*/, ",").split(",");

      const isType = options[0].length !== options[0].replace(/["']/g, "").length;
      if (isType) {
        // .enum("ACTIVE", "INACTIVE")
        meta.enum = { name: "", options: options.map((o) => o.replace(/["']/g, "")) };
      } else {
        // .enum(Status.Active, Status.Inactive)
        const enumName = options[0].split(".")[0];
        meta.enum = { name: enumName, options };
        const enumImportRegex = new RegExp(`import.+${enumName}.+"([^"]+)";`);
        const enumImportResult = enumImportRegex.exec(source);
        // find enum path
        if (enumImportResult) {
          // todo check
          meta.enum.path = enumImportResult[1];
        }
      }
      break;
    case FieldType.Relation:
      meta.relation = { model: getRelationModelName(field) };
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

  // code generator based meta
  const regExp = new RegExp(`@${fieldName}\\(([^\\)]+)\\)`, "i");
  const json = source.match(regExp);
  if (json) {
    try {
      const parsedMeta: IFieldMeta = JSON.parse(json[1]);
      meta = {
        ...meta,
        ...parsedMeta,
        enum: meta.enum,
        relation: meta.relation ? { ...meta.relation, ...parsedMeta.relation } : undefined,
      };
    } catch (e) {
      Log.error(`Error parsing model meta for '${modelName}'\n${json[1]}\n`);
    }
  }
  return meta;
}

export function getConfidentialFields(modelName: string): string[] {
  const model = parseModel(modelName);
  if (!model) {
    return [];
  }
  const confidentials = [];
  for (const field of model.module.schema.getFields()) {
    const meta: IFieldMeta = getFieldMeta(modelName, field.name);
    if (meta.confidential) {
      confidentials.push(field.name);
    }
  }
  return confidentials;
}

export function getOwnerVerifiedFields(modelName: string): string[] {
  const model = parseModel(modelName);
  if (!model) {
    return [];
  }
  const confidentials = [];
  for (const field of model.module.schema.getFields()) {
    const meta: IFieldMeta = getFieldMeta(modelName, field.name);
    if (meta.verifyOwner) {
      confidentials.push(field.name);
    }
  }
  return confidentials;
}

function getModel(modelName: string): ModelConstructor {
  if (!modelName) {
    return null;
  }
  const relativePath = compileModels();
  if (!relativePath) {
    return null;
  }
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

function compileModels() {
  const targetPath = `${Vesta.directories.temp}/vesta`;
  if (isModelGenerated) {
    return targetPath;
  }
  const tsConfigPath = `ts-${Date.now()}-config.json`;
  const targetTsConfig: any = readJsonFile(`${process.cwd()}/tsconfig.json`);

  if (targetTsConfig.extends) {
    const extConfig: any = readJsonFile(join(process.cwd(), targetTsConfig.extends));

    targetTsConfig.compilerOptions = {
      ...extConfig.compilerOptions,
      ...targetTsConfig.compilerOptions,
    };
  }
  const tsConfig = {
    compilerOptions: {
      ...targetTsConfig.compilerOptions,
      module: "commonjs",
      target: "es6",
      outDir: targetPath,
      noEmit: false,
    },
    include: [`${Vesta.directories.model}/**/*.ts`],
  };

  const command = targetTsConfig.compilerOptions.paths ? "ttsc" : "tsc";
  if (command === "ttsc") {
    // ttypescript, typescript-transform-paths
    if (!PackageManager.has("ttypescript", "typescript-transform-paths")) {
      Log.error(`to suuport alias install the following packages: ttypescript, typescript-transform-paths`, true);
    }
    tsConfig.compilerOptions.plugins = (tsConfig.compilerOptions.plugins || []).concat([
      {
        transform: "typescript-transform-paths",
      },
    ]);
  }

  writeFileSync(tsConfigPath, JSON.stringify(tsConfig), { encoding: "utf8" });

  try {
    execSync(`npx ${command} -p ${tsConfigPath}`, { cwd: process.cwd() });
    isModelGenerated = true;
  } catch (error) {
    Log.error(`${error.message}\n${error.stdout.toString()}`);
    return null;
  } finally {
    unlinkSync(tsConfigPath);
  }

  return targetPath;
}
