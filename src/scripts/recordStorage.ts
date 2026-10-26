/**
 * Manages the storage databases of records: moves the records and versions
 * of a resource (or standalone form) to the database set on its forms, moves
 * them back, checks the consistency between the main and the storage
 * databases.
 *
 * Usage:
 *   npm run record-storage -- status
 *   npm run record-storage -- move --structure <resource or form id>
 *   npm run record-storage -- revert --structure <resource or form id>
 *   npm run record-storage -- reconcile [--structure <resource or form id>]
 *
 * The storage is set directly in the database, on the forms:
 *   db.forms.updateOne({ _id: ObjectId('<core form id>') }, { $set: { storage: '<database>' } })
 *
 * Stop the application before moving or reverting a structure.
 */
import { startDatabase, stopDatabase } from '@server/database';
import {
  getStorageStatus,
  getStorageStructures,
  moveStorage,
  reconcileStorage,
  revertStorage,
} from '@utils/storage';

/**
 * Parses the command line: a command, then `--name value` options.
 *
 * @param argv Arguments, without the executable and script
 * @returns Command and options
 */
const parseArgs = (argv: string[]) => {
  const [command, ...rest] = argv;
  const options: { [name: string]: string } = {};
  for (let i = 0; i < rest.length; i += 2) {
    if (!rest[i].startsWith('--') || rest[i + 1] === undefined) {
      throw new Error(`Invalid option: ${rest[i]}`);
    }
    options[rest[i].slice(2)] = rest[i + 1];
  }
  return { command, options };
};

/**
 * Runs the script.
 */
const main = async () => {
  const { command, options } = parseArgs(process.argv.slice(2));
  const log = (message: string) => console.log(message);
  await startDatabase();
  try {
    switch (command) {
      case 'status': {
        const status = await getStorageStatus();
        if (!status.length) {
          log('No resource or form with a storage database');
        }
        console.table(status);
        break;
      }
      case 'move': {
        if (!options.structure) {
          throw new Error('move requires --structure <resource or form id>');
        }
        const report = await moveStorage(options.structure, { log });
        log(`Done: ${JSON.stringify(report)}`);
        break;
      }
      case 'revert': {
        if (!options.structure) {
          throw new Error('revert requires --structure <resource or form id>');
        }
        const moved = await revertStorage(options.structure, { log });
        log(`Done: ${moved} records moved back`);
        break;
      }
      case 'reconcile': {
        const ids = options.structure
          ? [options.structure]
          : (await getStorageStructures()).map((x) => String(x.id));
        for (const id of ids) {
          const report = await reconcileStorage(id, { log });
          log(`${id}: ${JSON.stringify(report)}`);
        }
        break;
      }
      default:
        throw new Error(
          'Usage: record-storage <status|move|revert|reconcile> [--structure <resource or form id>]'
        );
    }
  } finally {
    await stopDatabase();
  }
};

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
