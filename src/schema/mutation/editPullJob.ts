import {
  GraphQLError,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import { PullJobType } from '../types';
import errors from '../../const/errors';
import { status } from '../../const/enumTypes';
import { Channel, Form, PullJob } from '../../models';
import { AppAbility } from '../../security/defineAbilityFor';
import { StatusEnumType } from '../../const/enumTypes';
import GraphQLJSON from 'graphql-type-json';
import { scheduleJob, unscheduleJob } from '../../server/pullJobScheduler';

export default {
  /* Edit an existing pullJob if authorized
   */
  type: PullJobType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    status: { type: StatusEnumType },
    apiConfiguration: { type: GraphQLID },
    url: { type: GraphQLString },
    path: { type: GraphQLString },
    schedule: { type: GraphQLString },
    convertTo: { type: GraphQLID },
    mapping: { type: GraphQLJSON },
    uniqueIdentifiers: { type: new GraphQLList(GraphQLString) },
    channel: { type: GraphQLID },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(errors.userNotLogged);
    }
    const ability: AppAbility = user.ability;

    if (args.convertTo) {
      const form = await Form.findById(args.convertTo);
      if (!form) throw new GraphQLError(errors.dataNotFound);
    }

    if (args.channel) {
      const filters = {
        _id: args.channel,
      };
      const channel = await Channel.findOne(filters);
      if (!channel) throw new GraphQLError(errors.dataNotFound);
    }

    const update = {};
    Object.assign(
      update,
      args.name && { name: args.name },
      args.status && { status: args.status },
      args.apiConfiguration && { apiConfiguration: args.apiConfiguration },
      args.url && { url: args.url },
      args.path && { path: args.path },
      args.schedule && { schedule: args.schedule },
      args.convertTo && { convertTo: args.convertTo },
      args.mapping && { mapping: args.mapping },
      args.uniqueIdentifiers && { uniqueIdentifiers: args.uniqueIdentifiers },
      args.channel && { channel: args.channel }
    );
    const filters = PullJob.accessibleBy(ability, 'update')
      .where({ _id: args.id })
      .getFilter();
    const pullJob = await PullJob.findOneAndUpdate(filters, update, {
      new: true,
    }).populate({
      path: 'apiConfiguration',
      model: 'ApiConfiguration',
    });
    if (!pullJob) throw new GraphQLError(errors.dataNotFound);
    if (pullJob.status === status.active) {
      scheduleJob(pullJob);
    } else {
      unscheduleJob(pullJob);
    }
    return pullJob;
  },
};
