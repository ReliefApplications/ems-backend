import {GraphQLList, GraphQLError, GraphQLInt, GraphQLString} from 'graphql';
import errors from '../../const/errors';
import {Application, User} from '../../models';
import {ApplicationType, Connection, decodeCursor, encodeCursor, UserType} from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import GraphQLJSON from "graphql-type-json";

const DEFAULT_FIRST = 10;

export default {
    /*  List back-office users if logged user has admin permission.
        Throw GraphQL error if not logged or not authorized.
    */
    // type: new GraphQLList(UserType),
    type: Connection(UserType),
    args: {
        first: { type: GraphQLInt },
        afterCursor: { type: GraphQLString },
        // filters: { type: GraphQLJSON },
    },
    async resolve(parent, args, context) {
        console.log('IN REQUEST-------------');
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
            // return User.find({$and: [cursorFilters]}).limit(first + 1).populate({
            //     path: 'roles',
            //     match: { application: { $eq: null } }
            // });
            let items: any[] = await User.find({$and: [cursorFilters]}).limit(first + 1).populate({
                path: 'roles',
                match: { application: { $eq: null } }
            });
            console.log('items.length');
            console.log(items.length);
            console.log('items');
            console.log(items);
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
            // console.log(o);
            return o;

        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}
