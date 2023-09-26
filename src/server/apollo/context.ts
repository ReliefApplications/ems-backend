import { User } from '@models';
import { getICULocale } from '@utils/date/getICULocale';
import { AppAbility } from 'security/defineUserAbility';
import dataSources from './dataSources';
import { ApolloServer } from '@apollo/server';

/** Request context interface definition */
export interface Context {
  user: UserWithAbility;
  dataSources?: ReturnType<Awaited<ReturnType<typeof dataSources>>>;
  token?: string;
}

/** User interface with specified AppAbility */
interface UserWithAbility extends User {
  ability: AppAbility;
}

/**
 * Returns the apollo server express context function
 *
 * @param server Apollo server instance
 * @returns the context function
 */
export default (server: ApolloServer<Context>) =>
  async ({ req }): Promise<Context> => {
    if (req) {
      return {
        // Makes the translation library accessible in the context object.
        // https://github.com/i18next/i18next-http-middleware
        i18next: req.res.locals,
        // not a clean fix but that works for now
        user: (req as any).user,
        dataSources: (await dataSources(server))(),
        token: req.headers.authorization,
        timeZone: req.headers.usertimezone || 'UTC',
        locale: getICULocale(req?.headers?.language),
      } as Context;
    }
  };
