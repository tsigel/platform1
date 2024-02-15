import { knex, MK_DATE_PATTERN, MY_CLASS_API_KEY, REQUEST_QUEUE } from '../constants';
import fetch, { RequestInit } from 'node-fetch';
import { parse_response } from './parse_response';
import dayjs from 'dayjs';
import { pick } from 'ramda';
import { MyClass } from '../types/my_class';
import { make_query } from './make_query';
import { cache, make_time } from './cache';

const get_company_token_from_api = () =>
    REQUEST_QUEUE.push(() => fetch(`https://api.moyklass.com/v1/company/auth/getToken`, {
        method: 'POST',
        body: JSON.stringify({ apiKey: MY_CLASS_API_KEY }),
        headers: {
            'Content-Type': 'application/json'
        }
    }).then<GetTokenResponse>(parse_response));

const get_company_token = (): Promise<{ token: string }> =>
    knex('company_access_tokens')
        .select('*')
        .where('expiredAt', '>=', dayjs().add(1, 'hour').toISOString())
        .orderBy('expiredAt', 'desc')
        .then((tokens) => {
            const token = tokens.pop();

            if (!token) {
                return get_company_token_from_api()
                    .then((token_info) => {
                        return knex('company_access_tokens')
                            .insert([{ token: token_info.accessToken, expiredAt: token_info.expiresAt }])
                            .then(() => ({ token: token_info.accessToken }));
                    });
            }

            return pick(['token'], token);
        });

const private_req = (url: string, init?: RequestInit, query?: Record<string, string | number | Array<string | number>>) =>
    get_company_token()
        .then(({ token }) => REQUEST_QUEUE.push(() => fetch(`${url}${make_query(query ?? {})}`, {
            ...init,
            method: init?.method ?? 'GET',
            headers: Object.assign({
                'Content-Type': 'application/json',
                'X-Access-Token': token
            }, init?.headers ?? Object.create(null)),
            body: init?.body,
        })));

export const get_student = ({ student_id }: GetStudentProps) =>
    private_req(`https://api.moyklass.com/v1/company/users/${student_id}`)
        .then<GetStudentResponse>(parse_response);

export const update_student = (student_id: number, update_props: UpdateStudentProps) =>
    private_req(`https://api.moyklass.com/v1/company/users/${student_id}`, {
        method: 'POST',
        body: JSON.stringify(update_props),
    }).then<GetStudentResponse>(parse_response);

export const get_user_lessons = (student_id: number) =>
    private_req('https://api.moyklass.com/v1/company/lessons', {}, {
        userId: String(student_id),
        date: [dayjs().format(MK_DATE_PATTERN), dayjs().add(4, 'weeks').format(MK_DATE_PATTERN)],
        sort: 'date',
        limit: String(500)
    }).then<GetLessonsRecordResponse>(parse_response);

export const get_manager = cache(
    (manager_id: number) =>
        private_req(`https://api.moyklass.com/v1/company/managers/${manager_id}`)
            .then<{ id: number, name: string }>(parse_response),
    make_time(24, 'hours')
);


export const get_filials = cache(
    () =>
        private_req(`https://api.moyklass.com/v1/company/filials`)
            .then<Array<GetFilialsResponse>>(parse_response),
    make_time(4, 'hour')
);

export const get_courses = cache(() =>
    private_req(`https://api.moyklass.com/v1/company/courses`)
        .then<Array<CurseResponse>>(parse_response), make_time(4, 'hour')
);

export const get_classes = cache(() =>
    private_req(`https://api.moyklass.com/v1/company/classes`)
        .then<Array<ClassesResponse>>(parse_response), make_time(4, 'hour')
);

export const get_subscriptions_groups = cache(() =>
    private_req('https://api.moyklass.com/v1/company/subscriptionGroupings', {}, { includeSubscriptions: String(true) })
        .then<{
            groupings: Array<{
                id: number;
                name: string,
                subscriptions: Array<{ id: number }>
            }>
        }>(parse_response), make_time(4, 'hour'));

export const get_student_subscriptions = (props: GetUserSubscriptionsProps) =>
    private_req('https://api.moyklass.com/v1/company/userSubscriptions', {}, props)
        .then<GetUserSubscriptionsResponse>(parse_response);

export type MkPeriodExt = 'day' | 'month' | 'year';
export type MkPeriod = `${number} ${MkPeriodExt}`;

export enum MkSubscriptionStatus {
    Disabled = 1,
    Active = 2,
    Frozen = 3,
    Ended = 4
}

type GetUserSubscriptionsResponse = {
    subscriptions: Array<{
        id: number;
        period: MkPeriod | null;
        subscriptionId: number;
        visitCount: number;
        beginDate: string | null;
        endDate: string | null;
        statusId: MkSubscriptionStatus
        stats: {
            totalVisited: number;
            totalBurned: number;
        }
    }>
}

type GetUserSubscriptionsProps = {
    userId: number;
    statusId: Array<number>;
}

export type ClassesResponse = {
    id: number;
    name: string;
    beginDate: string;
    maxStudents: number;
    status: string;
    createdAt: string;
    courseId: number;
    payType: string;
    filialId: number;
    payPass: boolean;
    payPassRules: object;
    price: number;
    priceComment: string;
    showDates: boolean;
    priceForWidget: string;
    color: string;
    managerIds: Array<number>;
    comment: string;
    images: Array<any>;
    attributes: Array<any>;
}

export type CurseResponse = {
    id: number;
    name: string;
    shortDescription: string;
    siteUrl: string;
    description: string;
    createdAt: string;
    courseType: 'master' | 'course' | 'personal';
}

type GetFilialsResponse = {
    id: number;
    name: string;
    city: string;
    address: string;
    shortName: string;
    createdAt: string;
    timezone: string;
    status: string;
}

export const update_user_attribute = (student_id: number, attr_id: number, value: string) =>
    get_company_token()
        .then(({ token }) =>
            REQUEST_QUEUE.push(() => fetch(`https://api.moyklass.com/v1/company/users/${student_id}/attribute/${attr_id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Access-Token': token
                },
                body: JSON.stringify({ value })
            }).then<{ value: string }>(parse_response)));

export const get_all_attributes = () =>
    get_company_token()
        .then(({ token }) =>
            REQUEST_QUEUE.push(() => fetch(`https://api.moyklass.com/v1/company/userAttributes`, {
                    method: 'GET',
                    headers: {
                        'X-Access-Token': token
                    }
                }).then<Array<MyClass.Attribute>>(parse_response)
            ));

export type GetStudentProps = {
    student_id: number;
}

export type GetLessonsRecordResponse = {
    stats: {
        totalItems: number;
    }
    lessons: Array<{
        id: number;
        date: string;
        beginTime: string;
        endTime: string;
        topic: string;
        filialId: number;
        classId: number;
    }>
}

export type UpdateStudentProps = {
    name: string;
    email?: string | null;
    phone?: string;
    advSourceId?: number | null;
    createSourceId?: number | null;
    statusChangeReasonId?: number;
    clientStateId?: number;
    filials?: Array<number>;
    responsibles?: Array<number>;
    attributes?: Array<{ attributeId: number; value: string; }>
}

export type GetStudentResponse = {
    id: number;
    name: string;
    phone: string;
    email: string | null;
    updatedAt: string;
    createdAt: string;
    balans: number;
    availableBalance: number;
    responsibleId: number;
    advSourceId: number | null;
    createSourceId: number;
    statusChangeReasonId: null;
    stateChangedAt: null;
    clientStateId: number;
    filials: Array<number>;
    responsibles: Array<number>;
    attributes: Array<MyClass.StudentAttribute>;
}

export type GetTokenResponse = {
    accessToken: string;
    expiresAt: string;
    level: string;
}

export type GetUserTokenResponse = {
    'csrfToken': string;
    'expiresAt': string;
    'level': string;
}