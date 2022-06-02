import { User } from 'models';
import { AppAbility } from 'security/defineAbilityFor';

/** Request context interface definition */
export interface Context {
  user: UserWithAbility;
  dataSources?: any;
  token?: string;
}

/** User interface with specificed AppAbility */
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
export default ({ req, connection }): Context => {
  if (connection) {
    return {
      user: connection.context.user,
      token: req.headers.authorization,
    } as Context;
  }
  if (req) {
    return {
      // not a clean fix but that works for now
      user: (req as any).user,
      token: req.headers.authorization,
    } as Context;
  }
};
