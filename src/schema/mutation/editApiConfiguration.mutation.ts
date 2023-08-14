import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLError,
  GraphQLString,
} from 'graphql';
import { ApiConfiguration } from '@models';
import { ApiConfigurationType } from '../types';
import { AppAbility } from '@security/defineUserAbility';
import GraphQLJSON from 'graphql-type-json';
import { status, StatusEnumType, AuthEnumType } from '@const/enumTypes';
import * as CryptoJS from 'crypto-js';
import { buildTypes } from '@utils/schema';
import { validateApi } from '@utils/validators/validateApi';
import config from 'config';
import { logger } from '@services/logger.service';
import { cloneDeep, isEmpty, omit } from 'lodash';

/**
 * Edit the passed apiConfiguration if authorized.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: ApiConfigurationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    name: { type: GraphQLString },
    status: { type: StatusEnumType },
    authType: { type: AuthEnumType },
    endpoint: { type: GraphQLString },
    graphQLEndpoint: { type: GraphQLString },
    pingUrl: { type: GraphQLString },
    settings: { type: GraphQLJSON },
    permissions: { type: GraphQLJSON },
    userToken: { type: GraphQLString },
    userId: { type: GraphQLString }
  },
  async resolve(parent, args, context) {
    try {
      const user = context.user;
      if (!user) {
        throw new GraphQLError(
          context.i18next.t('common.errors.userNotLogged')
        );
      }

      const ability: AppAbility = user.ability;

      // Check if any of required arguments for a valid update are provided.
      // Else, send error
      // cloneDeep coupled with omit allows to filter out the 'id' field
      if (isEmpty(cloneDeep(omit(args, ['id'])))) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.apiConfiguration.edit.errors.invalidArguments'
          )
        );
      }
      // See if API name is usable
      if (args.name) {
        validateApi(args.name);
      }

      // Create the update document
      const update = {
        ...cloneDeep(omit(args, ['id'])),
        ...(args.settings && {
          settings: CryptoJS.AES.encrypt(
            JSON.stringify(args.settings),
            config.get('encryption.key')
          ).toString(),
        }),
      };

      // Find API configuration and update it using User permissions
      const filters = ApiConfiguration.accessibleBy(ability, 'update')
        .where({ _id: args.id })
        .getFilter();
      const apiConfiguration = await ApiConfiguration.findOneAndUpdate(
        filters,
        update,
        { new: true }
      );

      if (apiConfiguration) {
        if (args.status || apiConfiguration.status === status.active) {
          buildTypes();
        }
        return apiConfiguration;
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
