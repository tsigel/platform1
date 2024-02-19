import { User } from 'node-telegram-bot-api';
import { get_student_by_tg } from '../../utils/get_student_by_tg';
import { get_student, get_student_payments, PaymentOpType } from '../../utils/request_mk';
import { always, groupBy, isNotNil, pipe, prop, uniq } from 'ramda';
import { BigNumber } from '@waves/bignumber';
import { getFixedT, t } from 'i18next';
import { format_mk_date } from '../../utils/format_mk_date';
import { MessageSpliter } from '../../services/MessageSpliter';
import { TG_MK_ADMIN_USER } from '../../constants';
import { error } from '../../utils/log';

export const get_payments = (user: User) =>
    get_student_by_tg(user.id, true)
        .then((student_id) =>
            Promise
                .all([
                    get_student_payments(student_id)
                        .then(prop('payments')),
                    get_student({ student_id })
                        .then(prop('balans'))
                ]))
        .then(([payments, balance]) => {
            const t = getFixedT('ru', undefined, 'telegram.actions.payments');

            const date_group = groupBy(prop('date'), payments);
            const dates = uniq(payments.map(prop('date')));

            const tpl = dates.map((date) => {
                const payments = date_group[date]!;
                const type_hash = groupBy(prop('optype'), payments);

                return [
                    t('date', { date: format_mk_date(date) }),
                    [PaymentOpType.Income, PaymentOpType.Debit, PaymentOpType.Refund]
                        .map((type) => !type_hash[type]
                            ? null
                            : type_hash[type]!.map(({ optype, summa }) => {
                                return [
                                    t(`payments.${optype}`),
                                    t('income', {
                                        sign: [PaymentOpType.Income, PaymentOpType.Refund].includes(optype)
                                            ? '+' : '-',
                                        sum: new BigNumber(summa).abs().toFormat()
                                    })
                                ].join('\n');
                            }).join('\n')
                        ).filter(isNotNil).join('\n\n')
                ].join('\n');
            });

            return new MessageSpliter([
                ...tpl,
                new MessageSpliter([
                    t('balance', {
                        count: balance,
                        balance: new BigNumber(balance).toFormat(),
                        admin: TG_MK_ADMIN_USER
                    })
                ], '\n\n')
            ], '\n\n');
        })
        .catch(pipe(error, always(t('telegram.error'))));