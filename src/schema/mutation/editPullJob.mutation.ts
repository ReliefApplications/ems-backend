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
import { AppAbility } from '@security/defineUserAbility';
import { StatusEnumType } from '@const/enumTypes';
import GraphQLJSON from 'graphql-type-json';
import { scheduleJob, unscheduleJob } from '../../server/pullJobScheduler';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the editPullJob mutation */
type EditPullJobArgs = {
  id: string | Types.ObjectId;
  name?: string;
  status?: StatusType;
  apiConfiguration?: string | Types.ObjectId;
  url?: string;
  path?: string;
  schedule?: string;
  convertTo?: string | Types.ObjectId;
  mapping?: any;
  uniqueIdentifiers?: string[];
  channel?: string | Types.ObjectId;
};

/**
 * Edit an existing pullJob if authorized.
 */
export default {
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
  async resolve(parent, args: EditPullJobArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = user.ability;

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
      const filters = PullJob.find(accessibleBy(ability, 'update').PullJob)
        .where({ _id: args.id })
        .getFilter();
      try {
        const pullJob = await PullJob.findOneAndUpdate(filters, update, {
          new: true,
          runValidators: true,
        }).populate({
          path: 'apiConfiguration',
          model: 'ApiConfiguration',
        });
        if (!pullJob)
          throw new GraphQLError(
            context.i18next.t('common.errors.dataNotFound')
          );
        if (pullJob.status === status.active) {
          scheduleJob(pullJob);
        } else {
          unscheduleJob(pullJob);
        }
        return pullJob;
      } catch (err) {
        logger.error(err.message);
        throw new GraphQLError(err.message);
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
