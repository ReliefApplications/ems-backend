import { Record as RecordModel } from '@models';
import { Types } from 'mongoose';

/** The ID of the family form */
const FAMILY_FORM_ID = new Types.ObjectId('64de75fd3fb2a109ff8dddb4');

/**
 * Removes empty families when creating a new one
 *
 * @param rec The record of the family
 */
const onFamilyAdded = async (rec: RecordModel) => {
  const family = rec.data;

  if (!family) {
    return;
  }

  // Deletes all the empty families created by the same user before
  await RecordModel.find({
    $expr: {
      $and: [
        { $eq: ['$form', FAMILY_FORM_ID] },
        { $ne: ['$archived', true] },
        {
          $or: [
            { $not: { $isArray: '$data.members' } },
            { $eq: [{ $size: '$data.members' }, 0] },
          ],
        },
        {
          $or: [
            { $not: { $isArray: '$data.aids' } },
            { $eq: [{ $size: '$data.aids' }, 0] },
          ],
        },
        {
          $eq: ['$createdBy.user', new Types.ObjectId(rec.createdBy.user)],
        },
        {
          $ne: ['$_id', rec._id],
        },
      ],
    },
  });
};

export default onFamilyAdded;
