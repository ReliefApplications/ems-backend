import { Record } from '@models';

/**
 * Migrates the data of the family to the new structure
 *
 * @param rec Record of the new structure
 */
const onFamilyTransfer = async (rec: Record) => {
  const { structure, des_familles: familyIDs } = rec?.data ?? {};
  if (!structure || !familyIDs) return;

  // Find the family records
  const families = await Record.find({
    _id: { $in: familyIDs },
  });

  // Get all the family members
  const membersIDs = families.reduce(
    (acc, family) => acc.concat(family?.data?.members ?? []),
    []
  );

  // Update all records
  await Record.updateMany(
    {
      _id: { $in: [...familyIDs, ...membersIDs] },
    },
    {
      $set: {
        'data.registered_by': structure,
      },
    }
  );

  // Maybe delete the transfer record?
};

export default onFamilyTransfer;
