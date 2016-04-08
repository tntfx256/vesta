import {ICodeGenerator} from "../core/ICodeGenerator";
import {ClassGen} from "../core/ClassGen";
import {ProjectGen, IProjectGenConfig} from "../ProjectGen";
import {DatabaseGen} from "../core/DatabaseGen";
import {Placeholder} from "../core/Placeholder";
import {TsFileGen} from "../core/TSFileGen";

export class ApiFactoryGen implements ICodeGenerator {

    private factoryFile: TsFileGen;
    private factoryClass: ClassGen;

    constructor(private config: IProjectGenConfig) {
        this.factoryFile = new TsFileGen('ApiFactory');
        this.factoryClass = this.factoryFile.addClass();
        this.factoryFile.addImport('{Router}', 'express');
        this.factoryFile.addImport('{BaseController}', './BaseController');
        this.createMethod();
        this.loaderMethod();
    }

    private createMethod(): void {
        var method = this.factoryClass.addMethod('create', ClassGen.Access.Public, true);
        method.addParameter({name: 'version', type: 'string'});
        method.addParameter({name: 'setting'});
        var db = DatabaseGen.getDatabaseType(this.config.server.database);
        this.factoryFile.addImport(db.import, db.from);
        method.addParameter({name: 'database', type: db.type});
        method.setReturnType('Router');
        method.setContent(`var apiRouter = Router();
        var controllerRouter = ApiFactory.manualLoadControllers(setting, database);
        return apiRouter.use('/api/' + version, controllerRouter);`);
    }

    private loaderMethod(): void {
        var method = this.factoryClass.addMethod('manualLoadControllers', ClassGen.Access.Private, true);
        method.addParameter({name: 'setting'});
        var db = DatabaseGen.getDatabaseType(this.config.server.database);
        this.factoryFile.addImport(db.import, db.from);
        method.addParameter({name: 'database', type: db.type});
        method.setReturnType('Router');
        method.setContent(
            `var router: Router = Router();
        ${Placeholder.Router}
        return router;`);
    }

    generate(): string {
        return this.factoryFile.generate();
    }
}
