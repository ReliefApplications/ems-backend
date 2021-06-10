import { GraphQLError, GraphQLList } from 'graphql';
import errors from '../../const/errors';
import { Client } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { ClientType } from '../types';

export default {
    /*  List all clients available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: new GraphQLList(ClientType),
    args: {},
    resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = context.user.ability;
        return Client.find({}).accessibleBy(ability);
    }
}