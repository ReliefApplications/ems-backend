import { accessibleBy } from '@casl/mongoose';
import { StatusEnumType, StatusType } from '@const/enumTypes';
import { Application } from '@models';
import { graphQLAuthCheck } from '@schema/shared';
import { AppAbility } from '@security/defineUserAbility';
import { Context } from '@server/apollo/context';
import { logger } from '@services/logger.service';
import config from 'config';
import {
  GraphQLBoolean,
  GraphQLError,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLString,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { isEmpty, isNil } from 'lodash';
import { Types } from 'mongoose';
import pubsub from '../../server/pubsub';
import { ApplicationType } from '../types';

/** Arguments for the editApplication mutation */
type EditApplicationArgs = {
  id: string | Types.ObjectId;
  description?: string;
  sideMenu?: boolean;
  hideMenu?: boolean;
  name?: string;
  status?: StatusType;
  pages?: string[] | Types.ObjectId[];
  settings?: any;
  permissions?: any;
  shortcut?: string;
};

/**
 * Must be stored in config file, as an array of strings
 */
const protectedShortcuts: string[] = config.get('server.protectedShortcuts');

/**
 * Validate shortcut
 *
 * @param id application id
 * @param shortcut application shortcut
 */
export const validateShortcut = async (
  id: string | Types.ObjectId,
  shortcut: string
) => {
  const applicationWithShortcut = await Application.findOne({
    _id: { $ne: id },
    shortcut,
  }).select('shortcut');
  if (applicationWithShortcut || protectedShortcuts.includes(shortcut)) {
    throw new GraphQLError(
      applicationWithShortcut
        ? 'Shortcut is already used by another application.'
        : 'Shortcut not allowed by the system.'
    );
  }
};

/**
 * Find application from its id and update it, if user is authorized.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: ApplicationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    description: { type: GraphQLString },
    sideMenu: { type: GraphQLBoolean },
    hideMenu: { type: GraphQLBoolean },
    name: { type: GraphQLString },
    status: { type: StatusEnumType },
    pages: { type: new GraphQLList(GraphQLID) },
    settings: { type: GraphQLJSON },
    permissions: { type: GraphQLJSON },
    shortcut: { type: GraphQLString },
  },
  async resolve(parent, args: EditApplicationArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = context.user.ability;
      // Check that args were provided and object is not empty
      if (!args || isEmpty(args)) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.application.duplicate.errors.invalidArguments'
          )
        );
      }
      const filters = Application.find(
        accessibleBy(ability, 'update').Application
      )
        .where({ _id: args.id })
        .getFilter();
      let application = await Application.findOne(filters);
      if (!application) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      if (
        application.lockedBy &&
        application.lockedBy.toString() !== user._id.toString()
      ) {
        throw new GraphQLError('Please unlock application for edition.');
      }
      const update = {
        // lockedBy: user._id,
      };
      // Check if the applied shortcut is already in use
      if (!isNil(args.shortcut) && args.shortcut !== '') {
        await validateShortcut(args.id, args.shortcut);
      }
      Object.assign(
        update,
        args.name && { name: args.name },
        args.description && { description: args.description },
        args.status && { status: args.status },
        args.pages && { pages: args.pages },
        args.settings && { settings: args.settings },
        args.permissions && { permissions: args.permissions },
        !isNil(args.sideMenu) && { sideMenu: args.sideMenu },
        !isNil(args.hideMenu) && { hideMenu: args.hideMenu },
        !isNil(args.shortcut) && { shortcut: args.shortcut }
      );
      application = await Application.findOneAndUpdate(filters, update, {
        new: true,
      });
      const publisher = await pubsub();
      publisher.publish('app_edited', {
        application,
        user: user._id,
      });
      publisher.publish('app_lock', {
        application,
        user: user._id,
      });
      return application;
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
