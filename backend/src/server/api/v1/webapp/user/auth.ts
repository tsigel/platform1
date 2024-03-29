import { Middleware } from 'koa';
import { object, string } from 'yup';
import { yup_validate } from '../../../../../utils/yup_validate';
import { make_test_auth, validate_webapp_data } from '../../../../utils/validate_webapp_data';
import { get_student_by_tg } from '../../../../../utils/get_student_by_tg';
import { BadRequest, NotFound } from '../../../../middlewares/errors';
import dayjs from 'dayjs';
import { create } from '../../../../utils/token';
import { make_time } from '../../../../../utils/cache';
import { Token } from '../../../../../../compiled-proto/token';
import { base64Encode } from '@waves/ts-lib-crypto';
import { set_body } from '../../../../utils/set_body';
import { get_student, GetStudentResponse } from '../../../../../utils/request_mk';
import { applySpec, identity, pipe } from 'ramda';

const get_schema = () =>
    process.env.TEST_TG_USER
        ? object().shape({
            auth_data: string()
                .optional()
                .transform((value) => value === '' ? undefined : value)
                .default(make_test_auth(Number(process.env.TEST_TG_USER)))
        })
        : object().shape({
            auth_data: string().required()
        });

/**
 * @swagger
 * /api/v1/web-app/user/auth:
 *   post:
 *     summary: Получить токен авторизации для сессии
 *     description: >
 *       Возвращает токен авторизации для сессии
 *     tags:
 *       - User Public API
 *     parameters:
 *       - name: auth_data
 *         in: body
 *         description: >
 *           Данные, которые проставил пользователь в URL Telegram.
 *           Необходимы для проверки пользователя.
 *           Чтобы только пользователь Telegram мог получать данные из этой страницы.
 *           Данные, которые нужно отправить, находятся в window.Telegram.WebApp.initData.
 *         required: true
 *         schema:
 *           type: object
 *           required:
 *             - auth_data
 *           properties:
 *             auth_data:
 *               type: string
 *     responses:
 *       '200':
 *         description: >
 *           Успешный запрос. Проставляет токен сессии в cookie.
 *         schema:
 *           type: object
 *           properties:
 *             server_time:
 *               type: number
 *               description: Серверное время
 *             name:
 *               type: string
 *               description: Имя студента из МК
 *             phone:
 *               type: string
 *               description: Телефон студента из МК
 *             balance:
 *               type: number
 *               description: Баланс студента из МК
 *             token:
 *               type: string
 *               description: Токен для всех запросов юзера
 *       '401':
 *         description: Ошибки авторизации
 *       '403':
 *         description: Ошибки авторизации
 */
export const auth_M: Middleware = (ctx, next) =>
    yup_validate(get_schema(), ctx.request.body)
        .then(({ auth_data }) => {
            const {
                auth_date,
                user: {
                    id
                }
            } = validate_webapp_data(auth_data);

            if (auth_date * 1_000 < dayjs().subtract(10, 'minute').valueOf()) {
                throw new BadRequest(`Auth date is too old!`);
            }

            return get_student_by_tg(id, true, NotFound)
                .then(pipe<[number], { student_id: number }, Promise<GetStudentResponse>>(
                    applySpec({ student_id: identity }),
                    get_student
                ))
                .then(({ id, name, phone, balans }) => {
                    const token = create({
                        user_id: id,
                        scope: 'user',
                        token_live: make_time(1, 'day')
                    });

                    const token_str = base64Encode(Token.encode(token).finish());

                    return {
                        name,
                        phone,
                        balance: balans,
                        server_time: Date.now(),
                        token: token_str
                    };
                })
                .then(set_body(ctx))
                .then(next);
        });