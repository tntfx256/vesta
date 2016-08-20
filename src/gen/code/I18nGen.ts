import * as _ from "lodash";
import {Util} from "../../util/Util";
import {IProjectGenConfig} from "../ProjectGen";
import {Question} from "inquirer";
import {Log} from "../../util/Log";

export interface I18nGenConfig {
    locales: Array<string>;
    default: string;
    useMultilingualModel: boolean;
}
export class I18nGen {

    constructor(private config: I18nGenConfig) {
    }

    public static getGeneratorConfig(appConfig: IProjectGenConfig): Promise<IProjectGenConfig> {
        return Util.prompt(<Question>{type: 'confirm', name: 'enableI18n', message: 'Enable I18N support: '})
            .then(answer=> {
                if (!answer['enableI18n']) return appConfig;
                return Util.prompt([
                    <Question>{type: 'input', name: 'locales', message: 'Locales: '},
                    <Question>{type: 'confirm', name: 'useOnModel', message: 'Use on Models: '}
                ])
            })
            .then(answer=> {
                var locales = answer['locales'].split(',');
                if (!locales.length) return appConfig;
                for (var i = locales.length; i--;) {
                    locales[i] = _.trim(locales[i]);
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