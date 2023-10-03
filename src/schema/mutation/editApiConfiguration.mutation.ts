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
import {
  StatusEnumType,
  AuthEnumType,
  StatusType,
  AuthType,
} from '@const/enumTypes';
import * as CryptoJS from 'crypto-js';
import { validateApi } from '@utils/validators/validateApi';
import config from 'config';
import { logger } from '@services/logger.service';
import { accessibleBy } from '@casl/mongoose';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';

/** Arguments for the editApiConfiguration mutation */
type EditApiConfigurationArgs = {
  id: string | Types.ObjectId;
  name?: string;
  status?: StatusType;
  authType?: AuthType;
  endpoint?: string;
  graphQLEndpoint?: string;
  pingUrl?: string;
  settings?: any;
  permissions?: any;
};

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
  },
  async resolve(parent, args: EditApiConfigurationArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      const ability: AppAbility = user.ability;
      if (
        !args.name &&
        !args.status &&
        !args.authType &&
        !args.endpoint &&
        !args.pingUrl &&
        !args.graphQLEndpoint &&
        !args.settings &&
        !args.permissions
      ) {
        throw new GraphQLError(
          context.i18next.t(
            'mutations.apiConfiguration.edit.errors.invalidArguments'
          )
        );
      }
      const update = {};
      if (args.name) {
        validateApi(args.name);
      }
      Object.assign(
        update,
        args.name && { name: args.name },
        args.status && { status: args.status },
        args.authType && { authType: args.authType },
        args.endpoint && { endpoint: args.endpoint },
        args.graphQLEndpoint && { graphQLEndpoint: args.graphQLEndpoint },
        args.pingUrl && { pingUrl: args.pingUrl },
        args.settings && {
          settings: CryptoJS.AES.encrypt(
            JSON.stringify(args.settings),
            config.get('encryption.key')
          ).toString(),
        },
        args.permissions && { permissions: args.permissions }
      );
      const filters = ApiConfiguration.find(
        accessibleBy(ability, 'update').ApiConfiguration
      )
        .where({ _id: args.id })
        .getFilter();
      const apiConfiguration = await ApiConfiguration.findOneAndUpdate(
        filters,
        update,
        { new: true }
      );
      if (apiConfiguration) {
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
