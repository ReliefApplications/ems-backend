import { Record as RecordModel } from '@models';
import { Types } from 'mongoose';

/** The ID for the person form */
const PERSON_FORM_ID = new Types.ObjectId('64de7da43fb2a1a78b8de289');

/** The ID of the family form */
const FAMILY_FORM_ID = new Types.ObjectId('64de75fd3fb2a109ff8dddb4');

/** Find all people with broken family link and reestablishes it */
export const reestablishFamilyConnection = async () => {
  const people = await RecordModel.find({
    form: PERSON_FORM_ID,
    archived: { $ne: true },
  });

  // Creates an object with the family id as key and the list of people ids as value
  const peoplePerFamily: Record<string, string[]> = {};
  people.forEach((p) => {
    if (p.data.owner_resource) {
      if (!peoplePerFamily[p.data.owner_resource]) {
        peoplePerFamily[p.data.owner_resource] = [];
      }
      peoplePerFamily[p.data.owner_resource].push(p._id.toString());
    }
  });

  // Get families
  const families = await RecordModel.find({
    form: FAMILY_FORM_ID,
    archived: { $ne: true },
    _id: { $in: Object.keys(peoplePerFamily) },
  });

  // For each family, if the members are not the same, update the family
  families.forEach((f) => {
    const members = f.data?.members ?? [];

    // Check which members are missing
    const missingMembers = peoplePerFamily[f._id.toString()].filter(
      (m) => !members.includes(m)
    );

    if (missingMembers.length === 0) {
      // Append missing members
      f.data.members = members.concat(missingMembers);
      // Mark as modified
      f.markModified('data');
    }
  });

  // Save the families
  await RecordModel.bulkSave(families);
};

/**
 * Updated the members of the family when they are removed from it
 *
 * @param rec The record of the family
 */
const onFamilyUpdated = async (rec: RecordModel) => {
  // We get the records from the person form linked to this family
  const members = await RecordModel.find({
    form: PERSON_FORM_ID,
    archived: { $ne: true },
    'data.owner_resource': rec._id.toString(),
  });

  const familyMembers = await RecordModel.find({
    form: PERSON_FORM_ID,
    archived: { $ne: true },
    _id: { $in: (rec.data?.members ?? []).map((m) => new Types.ObjectId(m)) },
  });

  // For each member, if it is not in the family, remove the link
  members.forEach((m) => {
    if (!rec.data?.members?.includes(m._id.toString())) {
      m.data.owner_resource = null;
      m.markModified('data');
    }
  });

  // For each family member, if not linked to the family, add the link
  familyMembers.forEach((m) => {
    if (m.data?.owner_resource !== rec._id.toString()) {
      m.data.owner_resource = rec._id.toString();
      m.markModified('data');
    }
  });

  // Save the members
  await RecordModel.bulkSave([...members, ...familyMembers]);
};

export default onFamilyUpdated;
