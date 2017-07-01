import {IProjectConfig} from "../ProjectGen";
import {Question} from "inquirer";
import {Log} from "../../util/Log";
import {ask} from "../../util/Util";

export interface I18nGenConfig {
    locales: Array<string>;
    default: string;
    useMultilingualModel: boolean;
}
export class I18nGen {

    constructor(private config: I18nGenConfig) {
    }

    public static getGeneratorConfig(appConfig: IProjectConfig): Promise<IProjectConfig> {
        return ask(<Question>{type: 'confirm', name: 'enableI18n', message: 'Enable I18N support: '})
            .then(answer => {
                if (!answer['enableI18n']) return appConfig;
                return ask([
                    <Question>{type: 'input', name: 'locales', message: 'Locales: '},
                    <Question>{type: 'confirm', name: 'useOnModel', message: 'Use on Models: '}
                ])
            })
            .then(answer => {
                let locales = answer['locales'].split(',');
                if (!locales.length) return appConfig;
                for (let i = locales.length; i--;) {
                    locales[i] = locales[i].trim();
                    if (!/[a-z]{2}\-[A-Z]{2}/.exec(locales[i])) {
                        Log.error(`Invalid locale '${locales[i]}'`);
                    }
                }
                appConfig.i18n = <I18nGenConfig>{
                    locales: locales,
                    default: locales[0],
                    useMultilingualModel: answer['useOnModel']
                };
                return appConfig;
            })
    }
}