import {
  GraphQLBoolean,
  GraphQLID,
  GraphQLNonNull,
  GraphQLError,
} from 'graphql';
import { ApplicationType } from '../types';
import { AppAbility } from '../../security/defineAbilityFor';
import pubsub from '../../server/pubsub';
import { Application } from '../../models';

export default {
  type: ApplicationType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    lock: { type: new GraphQLNonNull(GraphQLBoolean) },
  },
  async resolve(parent, args, context) {
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }
    const ability: AppAbility = context.user.ability;
    const filters = Application.accessibleBy(ability, 'update')
      .where({ _id: args.id })
      .getFilter();
    let application = await Application.findOne(filters);
    if (!application) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }
    const update = {
      lockedBy: args.lock ? user.id : null,
      locked: args.lock,
    };
    application = await Application.findOneAndUpdate(filters, update, {
      new: true,
    });
    const publisher = await pubsub();
    publisher.publish('app_lock', {
      application,
      user: user.id,
    });
    return application;
  },
};
