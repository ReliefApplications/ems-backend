import { Record as RecordModel, User } from '@models';
import { Types } from 'mongoose';

/** The ID for the person form */
const PERSON_FORM_ID = new Types.ObjectId('64de7da43fb2a1a78b8de289');
/** The ID of the family form */
const FAMILY_FORM_ID = new Types.ObjectId('64de75fd3fb2a109ff8dddb4');
/** The ID of the aid form */
const AID_FORM_ID = new Types.ObjectId('64e6e0933c7bf35dfbf4f04e');
/** The ID of the staff form */
const STAFF_FORM_ID = new Types.ObjectId('649e9ec5eae9f845cd921f01');
/** The ID of the structure form */
const STRUCTURE_FORM_ID = new Types.ObjectId('649ade1ceae9f80d6591886a');

/**
 * Updated the members of the family when they are removed from it
 *
 * @param rec The record of the family
 */
const onStructureUpdated = async (rec: RecordModel) => {
  console.log('Updating structure', rec.data.name_struct);
  let {
    user_users: users,
    user_plus_users: usersPlus,
    head_of_structure_users: heads,
  } = rec.data ?? {};
  const structure = rec._id;

  users = users ?? [];
  usersPlus = usersPlus ?? [];
  heads = heads ?? [];

  // First we update the users questions in all other records that also save them
  await RecordModel.updateMany(
    { form: PERSON_FORM_ID, 'data.registered_by': structure.toString() },
    {
      $set: {
        'data.user_users': users,
        'data.user_plus_users': usersPlus,
        'data.head_of_structure_users': heads,
      },
    }
  );

  await RecordModel.updateMany(
    { form: FAMILY_FORM_ID, 'data.registered_by': structure.toString() },
    {
      $set: {
        'data.user_users': users,
        'data.user_plus_users': usersPlus,
        'data.head_of_structure_users': heads,
      },
    }
  );

  await RecordModel.updateMany(
    { form: AID_FORM_ID, 'data.registered_by': structure.toString() },
    {
      $set: {
        'data.user_users': users,
        'data.user_plus_users': usersPlus,
        'data.head_of_structure_users': heads,
      },
    }
  );

  await RecordModel.updateMany(
    { form: STAFF_FORM_ID, 'data.utilisateur_structure': structure.toString() },
    {
      $set: {
        'data.head_of_structure_users': heads,
      },
    }
  );

  // Now we update the actual user roles based on the question they are part of
  await User.updateMany(
    {
      _id: {
        // All users get the basic role
        $in: [...users, ...usersPlus, ...heads].map(
          (u) => new Types.ObjectId(u)
        ),
      },
    },
    {
      $addToSet: { roles: new Types.ObjectId('6511574c8e4cb3d8a3f22a82') },
    }
  );

  await User.updateMany(
    {
      // User plus and heads can see the graphs
      _id: { $in: [...usersPlus, ...heads].map((u) => new Types.ObjectId(u)) },
    },
    {
      $addToSet: { roles: new Types.ObjectId('668aab45a268e8463bf0d157') },
    }
  );

  await User.updateMany(
    {
      // Only the heads can see the structure management page
      _id: { $in: heads.map((u) => new Types.ObjectId(u)) },
    },
    {
      $addToSet: { roles: new Types.ObjectId('668aab26a268e8463bf0d14c') },
    }
  );
};

/**
 * Migrate all structures to update the users
 */
export const migrateAllStructures = async () => {
  const records = await RecordModel.find({
    form: STRUCTURE_FORM_ID,
    archived: { $ne: true },
  });

  for (const record of records) {
    await onStructureUpdated(record);
  }
};

export default onStructureUpdated;
