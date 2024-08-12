import { Schema, Types } from 'mongoose';
import config from 'config';
import onStructureAdded from './onStructureAdded';
import onFamilyTransfer from './onFamilyTransfer';
import onFamilyUpdated from './onFamilyEdited';
import onFamilyAdded from './onFamilyAdded';
import { Record } from '@models';
import onStructureUpdated from './onStructureUpdated';

/** Whether or not the current environment is Alimentaide */
const IS_ALIMENTAIDE =
  config.get('server.url') ===
    'https://alimentaide-973-guyane.oortcloud.tech/api' ||
  config.get('server.url') === 'https://demo.oortcloud.tech/api';
/** The ID of the structure form */
const STRUCTURE_FORM_ID = new Types.ObjectId('649ade1ceae9f80d6591886a');

/** The ID of the family transfer form */
const FAMILY_TRANSFER_FORM_ID = new Types.ObjectId('651cc305ae23f4bcd3f3f67a');

/** The ID of the family form */
const FAMILY_FORM_ID = new Types.ObjectId('64de75fd3fb2a109ff8dddb4');

/**
 * Custom logic for Alimentaide, to be replace with plugin in the future
 * When adding a new structure record, create the corresponding application
 *
 * @param schema Record schema
 */
export const setupCustomAlimentaideListeners = <DocType>(
  schema: Schema<DocType>
) => {
  // If not in the Alimentaide server, do nothing
  if (!IS_ALIMENTAIDE && config.util.getEnv('NODE_ENV') === 'production') {
    return;
  }

  schema.post('save', async function (doc) {
    const rec = doc as any;
    if (STRUCTURE_FORM_ID.equals(rec.form)) {
      await onStructureAdded(rec);
    } else if (FAMILY_TRANSFER_FORM_ID.equals(rec.form)) {
      await onFamilyTransfer(rec);
    }
  });

  schema.post('findOneAndUpdate', async function (doc) {
    if (FAMILY_FORM_ID.equals(doc.form)) {
      await onFamilyUpdated(doc);
    } else if (STRUCTURE_FORM_ID.equals(doc.form)) {
      await onStructureUpdated(doc);
    }
  });

  schema.post('save', async function (doc) {
    if (!(doc instanceof Record)) {
      return;
    }
    const rec = doc as Record;
    if (FAMILY_FORM_ID.equals(rec.form)) {
      await onFamilyAdded(rec);
    }
  });
};
