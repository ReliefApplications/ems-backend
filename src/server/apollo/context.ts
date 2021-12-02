import { User } from 'models';
import { AppAbility } from 'security/defineAbilityFor';

export interface Context {
  user: UserWithAbility;
  dataSources?: any;
  host?: string
}

interface UserWithAbility extends User {
  ability: AppAbility;
}

export default ({ req, connection }): Context => {
  if (connection) {
    return {
      user: connection.context.user,
      host: req.get('host'),
    } as Context;
  }
  if (req) {
    return {
      // not a clean fix but that works for now
      user: (req as any).user,
      host: req.get('host'),
    } as Context;
  }
};
