import { User } from 'models';
import { AppAbility } from 'security/defineAbilityFor';

export interface Context {
  user: UserWithAbility;
  dataSources?: any;
  token?: string;
}

interface UserWithAbility extends User {
  ability: AppAbility;
}

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
