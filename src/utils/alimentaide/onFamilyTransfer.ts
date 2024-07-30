import { Record } from '@models';
import onStructureUpdated from './onStructureUpdated';
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

  // Get the new network of the structure
  const newStructure = await Record.findOne({
    _id: structure,
  });

  const network = newStructure?.data?.network;

  // Update all records
  await Record.updateMany(
    {
      _id: { $in: [...familyIDs, ...membersIDs] },
    },
    {
      $set: {
        'data.registered_by': structure,
        'data.network': network,
      },
    }
  );

  // Update the ownership of the family (members) and aids
  onStructureUpdated(newStructure);

  // Maybe delete the transfer record?
};

export default onFamilyTransfer;
