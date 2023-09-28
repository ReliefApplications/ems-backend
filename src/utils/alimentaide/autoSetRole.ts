import { Role, User } from '@models';
import { Schema, Types } from 'mongoose';

/** ID of the staff form */
const STAFF_FORM_ID = new Types.ObjectId('649e9ec5eae9f845cd921f01');

/**
 * Custom logic for Alimentaide, to be replace with plugin in the future
 * When adding a new staff record, add the corresponding role to the user
 *
 * @param schema Record schema
 */
export const autoSetRole = <DocType>(schema: Schema<DocType>) => {
  schema.post('save', async function (doc) {
    const rec = doc as any;

    // Check that the form is the staff form
    if (!STAFF_FORM_ID.equals(rec.form)) {
      return;
    }

    // Get the user id from linked_user question, in case it was registered by head of structure
    const user = await User.findById(rec.data?.linked_user?.[0]);
    if (!user) {
      return;
    }

    // Check each role they have to see the ones that should be replaced
    const userRoles = await Role.find({ _id: { $in: user?.roles ?? [] } });
    const descRegex = /^GRANT_TO:[0-9a-fA-F]{24}$/;
    const rolesToReplace: Record<string, string> = userRoles.reduce(
      (acc, role) => {
        if (role.description && descRegex.test(role.description)) {
          acc[role._id.toString()] = role.description.split(':')[1];
        }
        return acc;
      },
      {}
    );

    // Update the user roles
    user.roles = user.roles.map(
      (role) => rolesToReplace[role.toString()] ?? role
    );

    // Save the user
    await user.save();
  });
};
