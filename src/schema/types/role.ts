import { GraphQLObjectType, GraphQLID, GraphQLString, GraphQLList, GraphQLInt } from 'graphql';
import { Permission, User, Application, Channel } from '../../models';
import { ApplicationType, PermissionType, ChannelType } from '.';
import { AppAbility } from '../../security/defineAbilityFor';

export const RoleType = new GraphQLObjectType({
    name: 'Role',
    fields: () => ({
        id: {
            type: GraphQLID,
            resolve(parent) {
                return parent._id;
            }
        },
        title: { type: GraphQLString },
        permissions: {
            type: new GraphQLList(PermissionType),
            resolve(parent) {
                return Permission.find().where('_id').in(parent.permissions);
            }
        },
        usersCount : {
            type: GraphQLInt,
            resolve(parent) {
                return User.find({ roles: parent.id }).count();
            }
        },
        application: {
            type: ApplicationType,
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return Application.findById(parent.application).accessibleBy(ability, 'read');
            }
        },
        channels: {
            type: new GraphQLList(ChannelType),
            resolve(parent, args, context) {
                const ability: AppAbility = context.user.ability;
                return Channel.accessibleBy(ability, 'read').where('_id').in(parent.channels);
            }
        }
    })
});
