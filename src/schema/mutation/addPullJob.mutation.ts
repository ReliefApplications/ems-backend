import {
  GraphQLError,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import { PullJobType } from '../types';
import { status } from '@const/enumTypes';
import { Channel, Form, PullJob } from '@models';
import { StatusEnumType } from '@const/enumTypes';
import GraphQLJSON from 'graphql-type-json';
import { scheduleJob, unscheduleJob } from '../../server/pullJobScheduler';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';

/**
 * Creates a new pulljob.
 * Throw an error if the user is not logged or authorized or if the form or channel aren't found.
 */
export default {
  type: PullJobType,
  args: {
    name: { type: new GraphQLNonNull(GraphQLString) },
    status: { type: new GraphQLNonNull(StatusEnumType) },
    apiConfiguration: { type: new GraphQLNonNull(GraphQLID) },
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
      throw new GraphQLError(context.i18next.t('common.errors.userNotLogged'));
    }

    const ability: AppAbility = user.ability;
    if (ability.can('create', 'PullJob')) {
      if (args.convertTo) {
        const form = await Form.findById(args.convertTo);
        if (!form)
          throw new GraphQLError(
            context.i18next.t('common.errors.dataNotFound')
          );
      }

      if (args.channel) {
        const filters = {
          _id: args.channel,
        };
        const channel = await Channel.findOne(filters);
        if (!channel)
          throw new GraphQLError(
            context.i18next.t('common.errors.dataNotFound')
          );
      }

      try {
        // Create a new PullJob
        const pullJob = new PullJob({
          name: args.name,
          status: args.status,
          apiConfiguration: args.apiConfiguration,
          url: args.url,
          path: args.path,
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
      } catch (err) {
        logger.error(err.message);
        throw new GraphQLError(err.message);
      }
    } else {
      throw new GraphQLError(
        context.i18next.t('common.errors.permissionNotGranted')
      );
    }
  },
};
