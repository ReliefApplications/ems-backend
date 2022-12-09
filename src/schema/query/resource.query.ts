import { GraphQLNonNull, GraphQLID, GraphQLError } from 'graphql';
import { ResourceType } from '../types';
import { Resource } from '@models';
import { AppAbility } from '@security/defineUserAbility';
import { getChoices } from '@utils/proxy/getChoices';

/**
 * Return resource from id if available for the logged user.
 * Throw GraphQL error if not logged.
 */
export default {
  type: ResourceType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
  },
  async resolve(parent, args, context) {
    // Authentication check
    const user = context.user;
    if (!user) {
      throw new GraphQLError(context.i18next.t('errors.userNotLogged'));
    }

    const ability: AppAbility = user.ability;
    const resource = await Resource.findOne({ _id: args.id });

    let index = 0;
    for await (const field of resource.fields) {
      if (field.choicesByUrl) {
        const fieldData = field;
        fieldData.choicesByUrl.value = '';
        fieldData.choicesByUrl.text = '';
        const choices = await getChoices(fieldData, '');
        resource.fields[index].choices = choices;
        index += 1;
      }
    }

    if (ability.cannot('read', resource)) {
      throw new GraphQLError(context.i18next.t('errors.permissionNotGranted'));
    }
    return resource;
  },
};
