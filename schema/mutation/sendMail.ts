import { GraphQLBoolean, GraphQLError, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLString } from "graphql";
import errors from "../../const/errors";
import { Record } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import transport from "../../server/transport";

export default {
    type: GraphQLBoolean,
    args: {
        ids: { type: new GraphQLNonNull(GraphQLList(GraphQLID)) },
        emails: { type: new GraphQLNonNull(GraphQLList(GraphQLString)) }
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }
        const ability: AppAbility = context.user.ability;
        
        const records = await Record.accessibleBy(ability, 'read').find({}).where('_id').in(args.ids).select('data');
        if (!records) { throw new GraphQLError(errors.permissionNotGranted); }

        const headers = Object.keys(records[0].data);
        const html = '<table><thead><tr>' +
            headers.map(x => `<th>${x}</th>`).join('') +
            '</tr></thead><tbody>' +
            records.map(x => `<tr>${headers.map(key => `<td>${x.data[key] ? x.data[key] : '-'}</td>`).join('')}</tr>`).join('') +
            '</tbody></table>';
        const info = await transport.sendMail({
            to: args.emails,
            from: 'pacome@reliefapplications.org',
            subject: 'test',
            // text: message
            html,
            // attachments: [{
            //     path: 'exclude-list.txt'
            // }]
            });
        return !(!info.messageId);
    }
}