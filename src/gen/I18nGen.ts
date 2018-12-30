import { Question } from "inquirer";
import { Log } from "../util/Log";
import { ask } from "../util/Util";
import { IProjectConfig } from "./ProjectGen";

export interface I18nConfig {
    locales: string[];
    useMultilingualModel: boolean;
}

export class I18nGen {

    public static getGeneratorConfig(appConfig: IProjectConfig) {
        return ask({ type: "confirm", name: "enableI18n", message: "Enable I18N support: " } as Question)
            .then((answer: any) => {
                if (!answer.enableI18n) { return appConfig; }
                return ask([
                    { type: "input", name: "locales", message: "Locales: " } as Question,
                    { type: "confirm", name: "useOnModel", message: "Use on Models: " } as Question,
                ]);
            })
            .then((answer: any) => {
                const locales = answer.locales.split(",");
                if (!locales.length) { return appConfig; }
                for (let i = locales.length; i--;) {
                    locales[i] = locales[i].trim();
                    if (!/[a-z]{2}\-[A-Z]{2}/.exec(locales[i])) {
                        return Log.error(`Invalid locale '${locales[i]}'`);
                    }
                }
                appConfig.i18n = {
                    locales,
                    useMultilingualModel: answer.useOnModel,
                } as I18nConfig;
                return appConfig;
            });
    }

    constructor(private config: I18nConfig) {
    }
}
