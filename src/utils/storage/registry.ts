import { Form } from '@models';
import { logger } from '@services/logger.service';
import mongoose, { Types } from 'mongoose';

/** How long the registry is trusted before being reloaded, in ms */
const REGISTRY_TTL = 30 * 1000;

/**
 * Storage database by structure id: the resources whose forms carry a
 * storage, each of their forms, and the standalone forms with a storage. The
 * GraphQL entities are built from resources and from non-core forms, so a
 * structure id may be the one of a form
 */
let storages = new Map<string, string>();
/** Time of the last successful load */
let loadedAt = 0;
/** Load in progress, if any */
let loading: Promise<void> | null = null;

/** The part of a form the storage resolution needs */
export type StorageForm = {
  _id: any;
  resource?: any;
  core?: boolean;
  storage?: string;
};

/**
 * Resolves the storage of a structure from its forms. The records of a
 * resource stay together: the storage of its core form applies to all of
 * them, and conflicting settings are reported.
 *
 * @param forms Forms of one structure: a resource, or a standalone form
 * @returns Name of the storage database, undefined for the main database
 */
export const resolveStructureStorage = (
  forms: StorageForm[]
): string | undefined => {
  const values = new Set(forms.map((x) => x.storage).filter((x) => x));
  if (values.size > 1) {
    logger.error(
      `Conflicting record storages on the forms of resource ${
        forms[0].resource
      }: ${[...values].join(', ')}`
    );
  }
  return (
    forms.find((x) => x.core && x.storage)?.storage ??
    forms.find((x) => x.storage)?.storage
  );
};

/**
 * Loads the forms with a storage, and the other forms of their resources.
 *
 * @returns Forms by structure id
 */
const loadStorageForms = async (): Promise<Map<string, StorageForm[]>> => {
  const select = '_id resource core storage';
  const flagged: StorageForm[] = await Form.find({
    storage: { $exists: true, $nin: [null, ''] },
  })
    .select(select)
    .lean();
  const resourceIds = [
    ...new Set(
      flagged.filter((x) => x.resource).map((x) => String(x.resource))
    ),
  ];
  const siblings: StorageForm[] = resourceIds.length
    ? await Form.find({ resource: { $in: resourceIds } })
        .select(select)
        .lean()
    : [];
  const byStructure = new Map<string, StorageForm[]>();
  for (const form of [...siblings, ...flagged.filter((x) => !x.resource)]) {
    const id = String(form.resource ?? form._id);
    byStructure.set(id, [...(byStructure.get(id) ?? []), form]);
  }
  return byStructure;
};

/**
 * Reloads the registry of the structures with a storage database.
 *
 * @returns Promise resolved once loaded
 */
export const refreshStorageRegistry = async (): Promise<void> => {
  if (!loading) {
    loading = (async () => {
      try {
        const next = new Map<string, string>();
        for (const [id, forms] of await loadStorageForms()) {
          const storage = resolveStructureStorage(forms);
          if (storage) {
            next.set(id, storage);
            forms.forEach((form) => next.set(String(form._id), storage));
          }
        }
        storages = next;
        loadedAt = Date.now();
      } finally {
        loading = null;
      }
    })();
  }
  return loading;
};

/**
 * Makes sure the registry is loaded and recent enough. To be awaited before
 * using the synchronous getter, typically at the start of a resolver.
 *
 * Without an open database connection (e.g. unit tests of pipeline builders),
 * the registry is left as it is instead of waiting for the connection.
 *
 * @returns Promise resolved once the registry is usable
 */
export const ensureStorageRegistry = async (): Promise<void> => {
  if (
    Date.now() - loadedAt > REGISTRY_TTL &&
    mongoose.connection.readyState === 1
  ) {
    await refreshStorageRegistry();
  }
};

/** Forces the next access to reload the registry */
export const invalidateStorageRegistry = (): void => {
  loadedAt = 0;
};

/**
 * Gets the storage of a structure, from the registry as last loaded.
 *
 * @param structureId Id of the resource, or of one of its forms, or of a standalone form
 * @returns Name of the storage database, undefined for the main database
 */
export const getStorageSync = (
  structureId?: Types.ObjectId | string | null
): string | undefined =>
  structureId ? storages.get(String(structureId)) : undefined;

/**
 * Gets the storage of a structure.
 *
 * @param structure Resource or form, or id of the resource, of one of its forms, or of a standalone form
 * @returns Name of the storage database, undefined for the main database
 */
export const getStorage = async (
  structure?: { _id?: any } | Types.ObjectId | string | null
): Promise<string | undefined> => {
  if (!structure) {
    return undefined;
  }
  await ensureStorageRegistry();
  return getStorageSync(
    typeof structure === 'object' && '_id' in structure
      ? structure._id
      : (structure as Types.ObjectId | string)
  );
};

/**
 * Gets all the storage databases in use, from the registry as last loaded.
 *
 * @returns Distinct names of the storage databases
 */
export const getStorages = (): string[] =>
  Array.from(new Set(storages.values()));
