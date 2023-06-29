import dataSources from './dataSources';
import { User } from '@models';
import { AppAbility } from 'security/defineUserAbility';
import onConnect from './onConnect';
import mongoose from 'mongoose';

/** Request context interface definition */
export interface Context {
  user: UserWithAbility;
  token?: string;
  i18next?: any;
  dataSources?: any;
  subscriptions?: any;
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
 * @param options.wsServer wsServer
 * @returns the context function
 */
export default async ({ req, connection, wsServer }): Promise<Context> => {
  // console.log(
  //   'req.headers.authorization =======test==>>>',
  //   req.headers.authorization
  // );
  if (connection) {
    const data: any = {
      dataSources: await dataSources(),
      user: await User.findOne({
        _id: mongoose.Types.ObjectId('63f8a66ddfc61e001e1a644b'),
      }),
      token: req.headers.authorization,
      subscriptions: {
        onConnect: onConnect(req, wsServer),
      },
      // user: connection.context.user,
      // token: req.headers.authorization,
    } as Context;
    console.log('data == IF==========>>>', JSON.stringify(data));
    return data;
  }
  if (req) {
    const data: any = {
      dataSources: await dataSources(),
      // Makes the translation library accessible in the context object.
      // https://github.com/i18next/i18next-http-middleware
      i18next: req.res.locals,
      // not a clean fix but that works for now
      user: await User.findOne({
        _id: mongoose.Types.ObjectId('63f8a66ddfc61e001e1a644b'),
      }),
      token: req.headers.authorization,
      subscriptions: {
        onConnect: onConnect(req, wsServer),
      },

      // i18next: req.res.locals,
      // // not a clean fix but that works for now
      // user: (req as any).user,
      // token: req.headers.authorization,
    } as Context;
    console.log('data ===ELSE=========>>>', JSON.stringify(data));
    return data;
  }
};
