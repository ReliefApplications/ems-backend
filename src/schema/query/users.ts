import { GraphQLError, GraphQLInt, GraphQLID} from 'graphql';
import errors from '../../const/errors';
import { User} from '../../models';
import { UserConnectionType, decodeCursor, encodeCursor } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';

const DEFAULT_FIRST = 10;

export default {
    /*  List back-office users if logged user has admin permission.
        Throw GraphQL error if not logged or not authorized.
    */
    type: UserConnectionType,
    args: {
        first: { type: GraphQLInt },
        afterCursor: { type: GraphQLID },
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;

        const first = args.first || DEFAULT_FIRST;
        const afterCursor = args.afterCursor;
        const cursorFilters = afterCursor ? {
            _id: {
                $gt: decodeCursor(afterCursor),
            }
        } : {};

        if (ability.can('read', 'User')) {
            let items: any[] = await User.find({$and: [cursorFilters]}).limit(first + 1).populate({
                path: 'roles',
                match: { application: { $eq: null } }
            });
            const hasNextPage = items.length > first;
            if (hasNextPage) {
                items = items.slice(0, items.length - 1);
            }
            const edges = items.map(r => ({
                cursor: encodeCursor(r.id.toString()),
                node: r,
            }));
            const o = {
                pageInfo: {
                    hasNextPage,
                    startCursor: edges.length > 0 ? edges[0].cursor : null,
                    endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null
                },
                edges,
                totalCount: await User.countDocuments()
            };
            return o;

        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}
