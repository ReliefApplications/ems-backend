import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ResourceType } from '../types';
import mongoose from 'mongoose';
import { Resource, Record, Form, Version, Channel, Notification } from '../../models';
import errors from '../../const/errors';
import { buildTypes } from '../../utils/schema';
import { AppAbility } from '../../security/defineAbilityFor';

export default {
  /*  Deletes a resource from its id.
        Throws GraphQL error if not logged or authorized.
    */
  type: ResourceType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) { throw new GraphQLError(errors.userNotLogged); }

    const ability: AppAbility = context.user.ability;
    const filters = Resource.accessibleBy(ability, 'delete').where({ _id: args.id }).getFilter();
    const deletedResource = await Resource.findOneAndDelete(filters);
    if (!deletedResource) throw new GraphQLError(errors.permissionNotGranted);

    // Delete recursively linked documents
    const { _id: resourceId } = deletedResource;
    const records = await Record.find({ resource: resourceId });
    for (const record of records) {
      await Version.deleteMany({ _id: { $in: record.versions.map(x => mongoose.Types.ObjectId(x)) } });
      await Record.findByIdAndRemove(record._id);
    }
    // delete recursively channel
    const forms = await Form.find({ resource: resourceId });
    const channels = await Channel.find({ form: { $in: forms.map(x => mongoose.Types.ObjectId(x._id )) } });
    await Notification.deleteMany({ channel: { $in: channels.map(x => mongoose.Types.ObjectId(x._id )) } });
    await Channel.deleteMany({ _id: { $in: channels.map(x => mongoose.Types.ObjectId(x._id )) } });
    await Form.deleteMany({ resource: resourceId });
        
    buildTypes();

    return deletedResource;
  },
};
