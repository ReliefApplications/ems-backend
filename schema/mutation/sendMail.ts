import { GraphQLBoolean, GraphQLError, GraphQLID, GraphQLList, GraphQLNonNull, GraphQLString } from "graphql";
import errors from "../../const/errors";
import { Form, Record } from "../../models";
import { AppAbility } from "../../security/defineAbilityFor";
import transport from "../../server/transport";
import { Parser } from 'json2csv';
import { pluralize } from 'inflection';
import getPermissionFilters from "../../utils/getPermissionFilters";

export default {
    type: GraphQLBoolean,
    args: {
        ids: { type: new GraphQLNonNull(GraphQLList(GraphQLID)) },
        emails: { type: new GraphQLNonNull(GraphQLList(GraphQLString)) },
        subject: { type: new GraphQLNonNull(GraphQLString) },
        attachment: { type: GraphQLBoolean },
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }
        const ability: AppAbility = context.user.ability;

        // const records = await Record.accessibleBy(ability, 'read').find({}).where('_id').in(args.ids).select('data form');
        // if (!records) { throw new GraphQLError(errors.permissionNotGranted); }

        let permissionFilters = [];
        const record: any = await Record.findById(args.ids[0]).populate({
            path: 'form',
            model: 'Form'
        });
        const form = record.form;
        let data: any[] = [];
        if (!form) {
            throw new GraphQLError(errors.dataNotFound);
        }

        const fields = form.fields.map(x => x.name);
        if (ability.cannot('read', 'Record')) {
            permissionFilters = getPermissionFilters(user, form, 'canSeeRecords');
            if (permissionFilters.length) {
                const records = await Record.find({
                    $and: [
                        { _id: { $in: args.ids } },
                        { form: form.id },
                        { $or: permissionFilters }
                    ]
                });
                data = records.map(x => x.data);
            }
        } else {
            const records = await Record.find({
                $and: [
                    { _id: { $in: args.ids } },
                    { form: form.id }
                ]
            });
            data = records.map(x => x.data);
        }

        const mail = {
            to: args.emails,
            from: `${user.name} <${user.username}>`,
            subject: args.subject,
        }

        if (args.attachment) {
            const json2csv = new Parser({ fields });
            const csv = json2csv.parse(data);
            mail['attachments'] = [{
                filename: `${pluralize(form.name)}.csv`,
                content: csv,
            }]
        } else {
            const headers = Object.keys(fields);
            const html = '<table><thead><tr>' +
                headers.map(x => `<th>${x}</th>`).join('') +
                '</tr></thead><tbody>' +
                data.map(x => `<tr>${headers.map(key => `<td>${x[key] ? x[key] : '-'}</td>`).join('')}</tr>`).join('') +
                '</tbody></table>';
            Object.assign(mail, html)
        }
        const info = await transport.sendMail(mail);
        return !(!info.messageId);
    }
}