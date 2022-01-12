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
import { StatusEnumType } from '../../const/enumTypes';
import GraphQLJSON from 'graphql-type-json';
import { scheduleJob, unscheduleJob } from '../../server/pullJobScheduler';
import { AppAbility } from '../../security/defineAbilityFor';

export default {
  /* Creates a new pullJob
   */
  type: PullJobType,
  args: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(StatusEnumType) },
    apiConfiguration: { type: new GraphQLNonNull(GraphQLID) },
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
    if (ability.can('create', 'PullJob')) {
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

      // Create a new PullJob
      const pullJob = new PullJob({
        name: args.name,
        status: args.status,
        apiConfiguration: args.apiConfiguration,
        schedule: args.schedule,
        convertTo: args.convertTo,
        mapping: args.mapping,
        uniqueIdentifiers: args.uniqueIdentifiers,
        channel: args.channel,
      });
      await pullJob.save();

      // If the pullJob is active, schedule it immediately
      if (args.status === status.active) {
        const fullPullJob = await PullJob.findById(pullJob.id).populate({
          path: 'apiConfiguration',
          model: 'ApiConfiguration',
        });
        scheduleJob(fullPullJob);
      } else {
        unscheduleJob(pullJob);
      }
      return pullJob;
    } else {
      throw new GraphQLError(errors.permissionNotGranted);
    }
  },
};
