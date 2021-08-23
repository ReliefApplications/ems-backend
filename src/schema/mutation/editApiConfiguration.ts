import { GraphQLNonNull, GraphQLID, GraphQLError, GraphQLString } from 'graphql';
import errors from '../../const/errors';
import { ApiConfiguration } from '../../models';
import { ApiConfigurationType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import GraphQLJSON from 'graphql-type-json';
import { status, StatusEnumType, AuthEnumType } from '../../const/enumTypes';
import * as CryptoJS from 'crypto-js';
import * as dotenv from 'dotenv';
import buildTypes from '../../utils/buildTypes';
dotenv.config();

export default {
    /*  Edit the passed apiConfiguration if authorized.
        Throws an error if not logged or authorized, or arguments are invalid.
    */
    type: ApiConfigurationType,
    args: {
        id: { type: new GraphQLNonNull(GraphQLID) },
        name: { type: GraphQLString },
        status: { type: StatusEnumType },
        authType: { type: AuthEnumType },
        endpoint: { type: GraphQLString },
        pingUrl: { type: GraphQLString },
        settings: { type: GraphQLJSON },
        permissions: { type: GraphQLJSON }
    },
    async resolve(parent, args, context) {
        const user = context.user;
        if (!user) {
            throw new GraphQLError(errors.userNotLogged);
        }
        const ability: AppAbility = user.ability;
        if (!args.name && !args.status && !args.authType && !args.settings && !args.permissions) {
            throw new GraphQLError(errors.invalidEditApiConfigurationArguments);
        }
        const update = {};
        Object.assign(update,
            args.name && { name: args.name },
            args.status && { status: args.status },
            args.authType && { authType: args.authType },
            args.endpoint && { endpoint: args.endpoint },
            args.pingUrl && { pingUrl: args.pingUrl },
            args.settings && { settings: CryptoJS.AES.encrypt(JSON.stringify(args.settings), process.env.AES_ENCRYPTION_KEY).toString() },
            args.permissions && { permissions: args.permissions }
        );
        const filters = ApiConfiguration.accessibleBy(ability, 'update').where({_id: args.id}).getFilter();
        const apiConfiguration = await ApiConfiguration.findOneAndUpdate(filters, update, {new: true});
        if (apiConfiguration) {
            if (apiConfiguration.status === status.active) {
                buildTypes();
            }
            return apiConfiguration;
        } else {
            throw new GraphQLError(errors.permissionNotGranted);
        }
    }
}
