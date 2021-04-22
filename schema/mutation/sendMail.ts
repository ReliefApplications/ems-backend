import { GraphQLBoolean, GraphQLError, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLString } from "graphql";
import errors from "../../const/errors";
import { Form, Record } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import transport from "../../server/transport";
import { Parser } from 'json2csv';
import { pluralize } from 'inflection';

export default {
    type: GraphQLBoolean,
    args: {
        ids: { type: new GraphQLNonNull(GraphQLList(GraphQLID)) },
        emails: { type: new GraphQLNonNull(GraphQLList(GraphQLString)) },
        subject: { type: new GraphQLNonNull(GraphQLString) },
        attachment: { type: GraphQLBoolean },
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }
        const ability: AppAbility = context.user.ability;
        
        const records = await Record.accessibleBy(ability, 'read').find({}).where('_id').in(args.ids).select('data form');
        if (!records) { throw new GraphQLError(errors.permissionNotGranted); }

        const mail = {
            to: args.emails,
            from: `${user.name} <${user.username}>`,
            subject: args.subject,
        }

        if (args.attachment) {
            const form = await Form.findById(records[0].form, 'fields name');
            const json2csv = new Parser({ fields: form.fields.map(x => x.name) });
            const csv = json2csv.parse(records.map(x => x.data));
            mail['attachments'] = [{
                filename: `${pluralize(form.name)}.csv`,
                content: csv,
            }]
        } else {
            const headers = Object.keys(records[0].data);
            const html = '<table><thead><tr>' +
                headers.map(x => `<th>${x}</th>`).join('') +
                '</tr></thead><tbody>' +
                records.map(x => `<tr>${headers.map(key => `<td>${x.data[key] ? x.data[key] : '-'}</td>`).join('')}</tr>`).join('') +
                '</tbody></table>';
            mail['html'] = html;
        }
        const info = await transport.sendMail(mail);
        return !(!info.messageId);
    }
}