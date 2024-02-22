import { Middleware } from 'koa';
import { SESSION_NAME } from '../../constants';
import { AuthError } from './errors';
import { parse } from '../utils/token';
import { Token } from '../../../compiled-proto/token';

export const check_token_M: MiddlewareWithToken = (ctx, next) => {
    const token_str = ctx.cookies.get(SESSION_NAME);

    if (!token_str) {
        throw new AuthError('Has no token!');
    }

    return parse(token_str)
        .then((token) => {
            ctx.state.token = token;
        })
        .then(next)
}

export type MiddlewareWithToken = Middleware<{ token: Token }>