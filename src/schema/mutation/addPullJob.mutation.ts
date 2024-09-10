import {
  GraphQLError,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import { PullJobType } from '../types';
import { StatusType, status } from '@const/enumTypes';
import { Channel, Form, PullJob } from '@models';
import { StatusEnumType } from '@const/enumTypes';
import GraphQLJSON from 'graphql-type-json';
import { scheduleJob, unscheduleJob } from '../../server/pullJobScheduler';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@lib/logger';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the addPullJob mutation */
type AddPullJobArgs = {
  name: string;
  status: StatusType;
  apiConfiguration: string | Types.ObjectId;
  url?: string;
  path?: string;
  schedule?: string;
  convertTo?: string | Types.ObjectId;
  mapping?: any;
  uniqueIdentifiers?: string[];
  channel?: string | Types.ObjectId;
};

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
  async resolve(parent, args: AddPullJobArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;

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
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
