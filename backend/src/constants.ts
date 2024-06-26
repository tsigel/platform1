import { config } from 'dotenv';
import { RequestQueue } from './services/RequestQueue';
import { get_env_strict } from './utils/get_env_prop';
import Knex from 'knex';
import { pipe } from 'ramda';
import { join } from 'node:path';
import { EventEmitter } from 'typed-ts-events';
import { MessageBussEvents } from './types/events';
import { error, info, warn } from './utils/log';
import TelegramBot from 'node-telegram-bot-api';
import { init } from 'i18next';
import locale from '../locales/ru/locale.json';
import 'dayjs/locale/ru.js';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import dayjs from 'dayjs';
import { BigNumber } from '@waves/bignumber';

dayjs.locale('ru');
dayjs.extend(customParseFormat);

config({
    path: join(__dirname, '..', '..', '.env')
});

BigNumber.config.set({
    FORMAT: {
        groupSeparator: ' '
    }
});

const CLASS_RPS = get_env_strict('CLASS_RPS', Number);
export const ROOT_PATH = join(__dirname, '..');
export const MAX_PACK_NAME_LENGTH = 100;
export const MAX_WORD_LENGTH = 100;
export const HOME_TASK_WORDS_REG = /##([^#]+)#([^#]+)##/g;
export const DEBUG_MODE = get_env_strict('DEBUG_MODE', pipe(Number, Boolean));
export const TG_TOKEN = get_env_strict('TG_TOKEN');
export const SESSION_SECRET = get_env_strict('SESSION_SECRET');
export const AUTH_HEADER_NAME = 'X-Session-Token';
export const TG_BOT_NAME = get_env_strict('TG_BOT_NAME');
export const TG_LINK_ATTRIBUTE_ID = get_env_strict('TG_LINK_ATTRIBUTE_ID', Number);
export const SERVER_PORT = get_env_strict('SERVER_PORT', Number);
export const MASS_SEND_CHANNEL_ID = get_env_strict('MASS_SEND_CHANNEL_ID', Number);
export const REQUEST_QUEUE = new RequestQueue(CLASS_RPS);
export const MY_CLASS_API_KEY = get_env_strict('MY_CLASS_API_KEY');
export const TG_MK_ADMIN_USER = get_env_strict('TG_MK_ADMIN_USER');
export const GOOGLE_SHEETS_API_KEY = get_env_strict('GOOGLE_SHEETS_API_KEY');
export const GOOGLE_SHEETS_ID = get_env_strict('GOOGLE_SHEETS_ID');
export const MASS_SEND_DELAY_MINUTES = get_env_strict('MASS_SEND_DELAY_MINUTES', Number);
export const MK_DATE_PATTERN = 'YYYY-MM-DD';
export const MAX_TG_MESSAGE_LENGTH = 1_024;
export const SYSTEM_PACK_ID = 0;
export const MESSAGE_BUS = new EventEmitter<MessageBussEvents>(error);
export const WORD_CONFLICT_COLUMNS = ['en', 'source'];
export const MIN_NOTIFY_WORDS_COUNT = get_env_strict('MIN_NOTIFY_WORDS_COUNT', Number);
export const NOTIFY_REPEAT_TIME = get_env_strict('NOTIFY_REPEAT_TIME');
export const TG = new TelegramBot(TG_TOKEN, {
    polling: true,
});

init({
    lng: 'ru',
    debug: DEBUG_MODE,
    ns: ['translation'],
    defaultNS: 'translation',
    resources: {
        ru: {
            translation: locale
        }
    }
});

export const knex = Knex({
    client: 'pg',
    debug: DEBUG_MODE,
    connection: {
        host: get_env_strict('DB_HOST'),
        user: get_env_strict('DB_USER'),
        database: 'postgres',
        password: get_env_strict('DB_PASS'),
        port: get_env_strict('DB_PORT', Number)
    },
    pool: {
        min: 0,
        max: get_env_strict('DB_MAX_CONNECTIONS', Number)
    },
    log: {
        warn,
        debug: info,
        error,
        deprecate: warn,
        enableColors: false,
    }
});