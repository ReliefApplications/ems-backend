import { Record, Resource } from '@models';
import NodeCache from 'node-cache';
import i18next from 'i18next';

/** Internal node cache object instance */
const cache = new NodeCache();

/** Default start padding size for the IDs */
const PADDING_MAX_LENGTH = 8;

/**
 * Finds holes in an array and returns all available numbers in it. Last indice is the lowest is the max of the array plus 1.
 * For instance findHoles([1,3,5,6,7]) returns [2,4,8]
 *
 * @param arr the array to find holes in
 * @returns holes in the array, last element is the smallest element for which
 */
function findHoles(arr: number[]): number[] {
  // sort the array in ascending order
  arr.sort((a, b) => a - b);

  const holes: number[] = [];
  let nextExpected = 1;

  for (const num of arr) {
    if (num > nextExpected) {
      // push the missing numbers into the holes array
      for (let i = nextExpected; i < num; i++) {
        holes.push(i);
      }
      nextExpected = num + 1;
    } else {
      nextExpected = num + 1;
    }
  }

  // add the last element
  holes.push(arr[arr.length - 1] + 1);

  return holes;
}

/**
 * Generates a new incremental ID for a record based on the year and resource, while ensuring that the ID is unique and sequential.
 *
 * @param {string} recordYear - Year of the record to be registered
 * @param {string} recordResource - Resource of the record to be registered
 * @returns {Promise<string>} The newly generated incremental ID.
 */
export const getNextId = async (recordYear: string, recordResource: string) => {
  // Get the available incremental IDs from cache.
  let availableIncrementalIds = cache.get('availableIncrementalIds') as any;

  // Get the previous incremental ID generated for the same resource, if it exists.
  const previousId = cache.get(recordResource + 'previousId') as string;

  // If there are no available incremental IDs in cache, fetch all incremental IDs from the database and find the available IDs.
  if (!availableIncrementalIds) {
    const allIds = await Record.find({}, { incrementalId: 1 });
    const incrementalIds = allIds.map((x) => x.incrementalId);
    availableIncrementalIds = {};
    // Split the incremental IDs into prefixes and sequential numbers, and store them in an object based on their prefixes.
    for (let i = 0; i < incrementalIds.length; i++) {
      const id = incrementalIds[i];
      const prefix = id.substring(0, 6);

      if (availableIncrementalIds[prefix]) {
        availableIncrementalIds[prefix].push(Number(id.substring(6)));
      } else {
        availableIncrementalIds[prefix] = [Number(id.substring(6))];
      }
    }

    // Find the holes in the sequential numbers for each prefix.
    Object.keys(availableIncrementalIds).forEach(function (key) {
      availableIncrementalIds[key] = findHoles(availableIncrementalIds[key]);
    });

    // Set the available incremental IDs in cache.
    cache.set('availableIncrementalIds', availableIncrementalIds);
  }

  //If previous id from the same resource is from the same year and the next available incremental ID is available, we can just assign it to the new guy
  if (
    previousId &&
    previousId.substring(0, 4) == recordYear &&
    availableIncrementalIds[previousId.substring(0, 6)].includes(
      Number(previousId.substring(6)) + 1
    )
  ) {
    try {
      const nextIncrementalId = `${previousId.substring(0, 6)}${String(
        Number(previousId.substring(6)) + 1
      ).padStart(PADDING_MAX_LENGTH, '0')}`;
      availableIncrementalIds[previousId.substring(0, 6)][0] =
        availableIncrementalIds[previousId.substring(0, 6)][0] + 1;

      cache.set('availableIncrementalIds', availableIncrementalIds);
      cache.set(recordResource + 'previousId', nextIncrementalId);
      return nextIncrementalId;
    } catch {
      throw new Error(
        i18next.t('utils.form.getNextId.errors.incrementalIdError')
      );
    }
  }
  //Create the prefix to put after the year
  const resourceName = (
    await Resource.findById(recordResource, { name: 1 })
  ).name[0].toUpperCase();
  const prefix = recordYear + '-' + resourceName;

  let newIncrementalId = '';

  try {
    if (!availableIncrementalIds[prefix]) {
      //Case where we are in a new year/a new letter
      newIncrementalId = prefix + '1'.padStart(PADDING_MAX_LENGTH, '0');
      availableIncrementalIds[prefix] =
        prefix + '2'.padStart(PADDING_MAX_LENGTH, '0');
    } else if (availableIncrementalIds[prefix].length == 1) {
      //Case where there are no holes
      newIncrementalId =
        prefix +
        availableIncrementalIds[prefix][0]
          .toString()
          .padStart(PADDING_MAX_LENGTH, '0');
      availableIncrementalIds[prefix][0] =
        availableIncrementalIds[prefix][0] + 1;
    } else {
      //Case with holes
      newIncrementalId =
        prefix +
        availableIncrementalIds[prefix]
          .shift()
          .toString()
          .padStart(PADDING_MAX_LENGTH, '0');
    }
  } catch {
    throw new Error(
      i18next.t('utils.form.getNextId.errors.incrementalIdError')
    );
  }

  cache.set('availableIncrementalIds', availableIncrementalIds);
  cache.set(recordResource + 'previousId', newIncrementalId);

  return newIncrementalId;
};
