import { GraphQLError, GraphQLInt, GraphQLID } from 'graphql';
import { ApiConfigurationConnectionType, encodeCursor, decodeCursor } from '../types';
import { ApiConfiguration } from '../../models';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';

const DEFAULT_FIRST = 10;

export default {
    /*  List all apiConfiguration available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: ApiConfigurationConnectionType,
    args: {
        first: { type: GraphQLInt },
        afterCursor: { type: GraphQLID },
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;

        const abilityFilters = ApiConfiguration.accessibleBy(ability, 'read').getFilter();
        const filters: any[] = [abilityFilters];

        const first = args.first || DEFAULT_FIRST;
        const afterCursor = args.afterCursor;
        const cursorFilters = afterCursor ? {
                _id: {
                    $gt: decodeCursor(afterCursor),
                }
            } : {};

        let items: any[] = await ApiConfiguration.find({ $and: [cursorFilters, ...filters] })
            .limit(first + 1);

        const hasNextPage = items.length > first;
        if (hasNextPage) {
            items = items.slice(0, items.length - 1);
        }
        const edges = items.map(r => ({
            cursor: encodeCursor(r.id.toString()),
            node: r,
        }));
        return {
            pageInfo: {
                hasNextPage,
                startCursor: edges.length > 0 ? edges[0].cursor : null,
                endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null
            },
            edges,
            totalCount: await ApiConfiguration.countDocuments({ $and: filters })
        };
    },
}
