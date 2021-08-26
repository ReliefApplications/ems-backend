import { GraphQLID, GraphQLNonNull, GraphQLError, GraphQLList } from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import errors from '../../const/errors';
import { RecordType } from '../types';
import { Form, Record, Notification, Channel } from '../../models';
import { transformRecord } from '../../utils/form';
import { AppAbility } from '../../security/defineAbilityFor';
import mongoose from 'mongoose';
import pubsub from '../../server/pubsub';
import convertFilter from '../../utils/convertFilter';
import { GraphQLUpload } from 'apollo-server-core';

export default {
    /*  Adds a record to a form, if user authorized.
        Throws a GraphQL error if not logged or authorized, or form not found.
        TODO: we have to check form by form for that.
    */
    type: RecordType,
    args: {
        form: { type: GraphQLID },
        data: { type: new GraphQLNonNull(GraphQLJSON) },
        files: { type: new GraphQLList(GraphQLUpload)}
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        // Check the two layers of permissions
        const ability: AppAbility = user.ability;
        const form = await Form.findById(args.form);
        if (!form) throw new GraphQLError(errors.dataNotFound);
        let canCreate = false;
        if (ability.can('create', 'Record')) {
            canCreate = true;
        } else {
            const roles = user.roles.map(x => mongoose.Types.ObjectId(x._id));
            canCreate = form.permissions.canCreateRecords.length > 0 ? form.permissions.canCreateRecords.some(x => roles.includes(x)) : true;
        }
        // Check unicity of record
        if (form.permissions.recordsUnicity) {
            const unicityFilter = convertFilter(form.permissions.recordsUnicity, Record, user);
            if (unicityFilter) {
                const uniqueRecordAlreadyExists = await Record.exists({ $and: [{ form: form._id }, unicityFilter] });
                canCreate = !uniqueRecordAlreadyExists;
            }
        }
        if (canCreate) {
            await transformRecord(args.data, form.fields);
            const record = new Record({
                form: args.form,
                createdAt: new Date(),
                modifiedAt: new Date(),
                data: args.data,
                resource: form.resource ? form.resource : null,
                createdBy: {
                    user: user.id,
                    roles: user.roles.map(x => x._id),
                    positionAttributes: user.positionAttributes.map(x => {
                        return {
                            value: x.value,
                            category: x.category._id
                        }
                    })
                }
            });
            // send notifications to channel
            const channel = await Channel.findOne({ form: form._id });
            if (channel) {
                const notification = new Notification({
                    action: `New record - ${form.name}`,
                    content: record,
                    createdAt: new Date(),
                    channel: channel.id,
                    seenBy: []
                });
                await notification.save();
                const publisher = await pubsub();
                publisher.publish(channel.id, { notification });
            }
            await record.save();
            return record;
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    },
}
