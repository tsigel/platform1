import { MiddlewareWithToken } from '../../../../../middlewares/check_token_M';
import { yup_validate } from '../../../../../../utils/yup_validate';
import { get_or_create_pack } from '../../../../../../utils/get_or_create_pack';
import { randomUUID } from 'crypto';
import { Word, WordSourcePrefix } from '../../../../../../types/Wokobular';
import { always, assoc } from 'ramda';
import { add_pack_words } from '../../../../../utils/words/add_pack_words';
import { set_body } from '../../../../../utils/set_body';
import { object } from 'yup';
import { pack_name_edit, pack_word, word_status, words } from '../../../../../utils/schemas';

const schema = object().shape({
    name: pack_name_edit,
    words: words.of(object().shape({
        ru: pack_word,
        en: pack_word,
        status: word_status
    }))
});
/**
 * @swagger
 * /api/v1/web-app/user/packs/{pack_id}:
 *   patch:
 *     summary: Обновить колоду пользователя
 *     description: >
 *       Обновляет колоду пользователя
 *     tags:
 *       - User Private API
 *     consumes:
 *       - application/json
 *     parameters:
 *       - name: X-Session-Token
 *         in: header
 *         type: string
 *         required: true
 *         description: >
 *           Токен авторизации полученный в запросе /api/v1/webhooks/user-create
 *       - name: pack_id
 *         in: path
 *         required: true
 *         description: id колоды
 *         type: integer
 *       - name: body
 *         in: body
 *         description: Данные колоды
 *         schema:
 *            type: object
 *            required:
 *              - name
 *              - words
 *            properties:
 *              name:
 *                type: string
 *              words:
 *                type: object
 *                description: >
 *                  Принимает новые слова без id и те что надо отредактировать с id.
 *                  Если в метод не передавать существующие в колоде слова, то они останутся в колоде.
 *                properties:
 *                  id:
 *                    type: integer
 *                  ru:
 *                    type: string
 *                  en:
 *                    type: string
 *                  status:
 *                    type: string
 *                    enum: [ACTIVE, DELETED]
 *     responses:
 *       '200':
 *         description: >
 *           Колода успешно обновлена.
 *         schema:
 *            type: object
 *            properties:
 *              ok:
 *                type: boolean
 */
export const update_pack_M: MiddlewareWithToken = (ctx, next) =>
    yup_validate(schema, ctx.request.body, { ...ctx.state, ...ctx.params })
        .then(({ name, words }) => {
            const insert_id = randomUUID();

            return get_or_create_pack({
                name,
                user_can_edit: true,
                parent_user_id: ctx.state.student_id,
                insert_id
            }).then(pack => add_pack_words(
                pack,
                words.map<Omit<Word, 'insert_id' | 'id'>>(assoc('source', WordSourcePrefix.UserAdd)),
                insert_id
            )).then(always({ ok: true }));
        })
        .then(set_body(ctx))
        .then(next);
