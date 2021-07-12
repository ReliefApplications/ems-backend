import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { FormType } from '../types';
import mongoose from 'mongoose';
import { Form, Record, Resource, Version, Channel, Notification } from '../../models';
import deleteContent from '../../services/deleteContent';
import errors from '../../const/errors';
import buildTypes from '../../utils/buildTypes';
import { AppAbility } from '../../security/defineAbilityFor';

export default {
    /*  Finds form from its id and delete it, and all records associated, if user is authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: FormType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
    },
    async resolve(parent, args, context) {
        // Authentication check
        const user = context.user;
        if (!user) { throw new GraphQLError(errors.userNotLogged); }

        const ability: AppAbility = context.user.ability;
        const filters = Form.accessibleBy(ability, 'delete').where({ _id: args.id }).getFilter();
        const form = await Form.findOne(filters);
        if (form) {
            // Delete the versions associated to that form.
            await Version.deleteMany({ _id: { $in: form.versions.map(x => mongoose.Types.ObjectId(x)) } });
            // if is core form we have to delete the linked forms and resource
            if (form.core === true) {
                // delete linked forms and their channel
                const forms = await Form.find({ resource: mongoose.Types.ObjectId(form.resource) });
                for (const form of forms) {
                    const channel = await Channel.findOneAndDelete({ form: form._id});
                    if (channel)  {
                        await deleteContent(channel);
                        await Notification.deleteMany({ channel: channel._id });
                    }
                }
                await Form.deleteMany({ resource: mongoose.Types.ObjectId(form.resource) });
                // delete resource
                await Resource.deleteOne({ _id: form.resource });
            }
            const channel = await Channel.findOneAndDelete({ form: form._id});
            if (channel)  {
                await deleteContent(channel);
                await Notification.deleteMany({ channel: channel._id });
            }
            return Form.findByIdAndRemove(args.id, null, () => {
                // Also deletes the records associated to that form.
                Record.remove({ form: args.id }).exec();
                Record.remove({ resource: form.resource }).exec();
                buildTypes()
            });
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}
