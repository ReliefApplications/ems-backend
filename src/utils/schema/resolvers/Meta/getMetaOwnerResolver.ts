import { Role } from '@models';
import mongoose from 'mongoose';

/**
 * Return owner meta resolver.
 *
 * @param field field definition.
 * @returns Owner resolver.
 */
const getMetaOwnerResolver = async (field: any) => {
  const roles = await Role.find({
    application: {
      $in: field.applications.map((x) => mongoose.Types.ObjectId(x)),
    },
  })
    .select('id title application')
    .populate({
      path: 'application',
      model: 'Application',
    });
  return Object.assign(field, {
    choices: roles.map((x) => {
      return {
        text: `${x.application.name} - ${x.title}`,
        value: x.id,
      };
    }),
  });
};

export default getMetaOwnerResolver;
