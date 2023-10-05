import { Record } from '@models';

/**
 * Migrates the data of the family to the new structure
 *
 * @param rec Record of the new structure
 */
const onFamilyTransfer = async (rec: Record) => {
  const { new_ownership: newStructure, members } = rec?.data || {};
  if (!newStructure) {
    return;
  }

  // Update all records
  await Record.updateMany(
    {
      _id: { $in: [rec._id, ...members] },
    },
    {
      $set: {
        'data.registered_by': newStructure,
        'data.new_ownership': undefined,
      },
    }
  );
};

export default onFamilyTransfer;
