import { GraphQLError, GraphQLBoolean, GraphQLNonNull, GraphQLInt, GraphQLID } from 'graphql';
import { RecordType, Connection, encodeCursor, decodeCursor } from '../types';
import { Record, Form } from '../../models';
import errors from '../../const/errors';
import { AppAbility } from '../../security/defineAbilityFor';

const DEFAULT_FIRST = 10;

export default {
    /*  List all records available for the logged user.
        Throw GraphQL error if not logged.
    */
    type: Connection(RecordType),
    args: {
        first: { type: GraphQLInt },
        afterCursor: { type: GraphQLID },
        id: { type: new GraphQLNonNull(GraphQLID) },
        isForm: { type: GraphQLBoolean },
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }
        const ability: AppAbility = context.user.ability;

        // get the form where the records are from
        const formFilters = args.isForm ? Form.accessibleBy(ability, 'read').where({_id: args.id}).getFilter() 
        : Form.accessibleBy(ability, 'read').where({ resource: args.id }).getFilter();

        const form = await Form.findOne(formFilters);
        
        const abilityFilters = ability.can('update', 'Form') ? Record.accessibleBy(ability, 'read').where({ form: form._id }).getFilter() 
        : Record.accessibleBy(ability, 'read').where({ form: form._id, archived: { $ne: true } }).getFilter();

        const filters: any[] = [abilityFilters];

        const first = args.first || DEFAULT_FIRST;
        const afterCursor = args.afterCursor;
        const cursorFilters = afterCursor ? {
                _id: {
                    $gt: decodeCursor(afterCursor),
                }
            } : {};

        let items: any[] = await Record.find({ $and: [cursorFilters, ...filters] })
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
            totalCount: await Record.countDocuments({ $and: filters })
        };
    },
}
