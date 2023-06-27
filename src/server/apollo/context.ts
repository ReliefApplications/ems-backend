import { User } from '@models';
import { AppAbility } from 'security/defineUserAbility';
import dataSources from './dataSources';
// import onConnect from './onConnect';

/** Request context interface definition */
export interface Context {
  user: UserWithAbility;
  dataSources?: any;
  token?: string;
  // subscriptions?: any;
}

/** User interface with specified AppAbility */
interface UserWithAbility extends User {
  ability: AppAbility;
}

/**
 * The apollo server express context function
 *
 * @param options the context function options
 * @param options.req request
 * @param options.connection connection
 * @returns the context function
 */
export default async ({ req, connection }): Promise<Context> => {
  // console.log(
  //   'req.headers.authorization =======test==>>>',
  //   req.headers.authorization
  // );
  // console.log('req =====all====>>>', req);
  if (connection) {
    const data: any = {
      user: connection.context.user,
      token: req.headers.authorization,
      dataSources: await dataSources(),
      // subscriptions: {
      //   onConnect: onConnect,
      // },
    } as Context;
    console.log('data ============>>>', JSON.stringify(data));
    return data;
  }
  if (req) {
    const data: any = {
      // Makes the translation library accessible in the context object.
      // https://github.com/i18next/i18next-http-middleware
      i18next: req.res.locals,
      // not a clean fix but that works for now
      user: (req as any).user,
      token: req.headers.authorization,
      dataSources: await dataSources(),
      // subscriptions: {
      //   onConnect: onConnect,
      // },
    } as Context;
    console.log('data ============>>>', JSON.stringify(data));
    return data;
  }
};
