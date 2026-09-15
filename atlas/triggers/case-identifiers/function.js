/**
 * Atlas Database Trigger function: `records-case-identifiers`
 *
 * Assigns and protects two identifiers on records of the "Case" resource.
 *
 * 1. `data.cecis_number`, from `data.cecis_case`:
 *    - cecis_case === true  -> "UA" + 4-digit incremental number  (UA0001, UA0002, ...)
 *    - cecis_case === false -> "NC" + 6-digit incremental number  (NC000001, NC000002, ...)
 *    Once cecis_case has been set (true/false) it can no longer change, nor can
 *    cecis_number: any edit changing them is reverted to the previous values.
 *
 * 2. `data.case_id`, from `data.military`, formatted like the platform incremental ID:
 *    - military === false -> "<year>-C" + 8-digit incremental number (2026-C00000001)
 *    - military === true  -> "<year>-M" + 8-digit incremental number (2026-M00000001)
 *    The year is the record creation year; sequences are per year and per letter.
 *    Once assigned, case_id can no longer change (edits are reverted).
 *
 * A cloned record (insert carrying existing identifiers) always gets fresh ones.
 *
 * The next number is the highest one already stored on the resource + 1. No extra
 * collection is used: the trigger must run with "Event ordering" enabled so that
 * two inserts cannot compute the same number. A uniqueness check + retry covers
 * the remaining edge cases.
 *
 * See README.md next to this file for the trigger configuration.
 */
exports = async function (changeEvent) {
  /** Resource whose records are handled by this trigger. */
  const RESOURCE_ID = '6a1f45cbec51d33e953e4a52';
  /** Name of the linked data source (Atlas "Service Name"). */
  const SERVICE_NAME = 'mongodb-atlas';
  /** Attempts to find a free number before giving up. */
  const MAX_ATTEMPTS = 5;
  /** cecis_number rules, keyed by the value of cecis_case. */
  const CECIS_FORMATS = {
    true: { prefix: 'UA', digits: 4, pattern: /^UA(\d{4,})$/ },
    false: { prefix: 'NC', digits: 6, pattern: /^NC(\d{6,})$/ },
  };
  /** case_id letter, keyed by the value of military. */
  const CASE_ID_LETTERS = { true: 'M', false: 'C' };
  /** case_id digits. */
  const CASE_ID_DIGITS = 8;
  /** Any well-formed case_id. */
  const CASE_ID_PATTERN = /^\d{4}-[CM]\d{8,}$/;

  const { operationType, ns, documentKey, fullDocument } = changeEvent;
  if (!['insert', 'update', 'replace'].includes(operationType)) {
    return;
  }
  // fullDocument can be null if the record was deleted before the lookup
  if (!fullDocument || !fullDocument.resource) {
    return;
  }
  if (String(fullDocument.resource) !== RESOURCE_ID) {
    return;
  }

  const db = context.services.get(SERVICE_NAME).db(ns.db);
  const records = db.collection(ns.coll);

  const isBoolean = (v) => typeof v === 'boolean';
  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  /** True if another record of the resource already uses this value in the given field. */
  const isUsedElsewhere = async (field, value) => {
    const other = await records.findOne(
      {
        _id: { $ne: documentKey._id },
        resource: fullDocument.resource,
        [`data.${field}`]: value,
      },
      { projection: { _id: 1 } }
    );
    return !!other;
  };

  /** Highest sequence already stored on the resource for `<prefix><digits>` values (0 if none). */
  const maxSequence = async (field, prefix) => {
    const [maxDoc] = await records
      .aggregate([
        {
          $match: {
            resource: fullDocument.resource,
            [`data.${field}`]: { $regex: `^${escapeRegExp(prefix)}\\d+$` },
          },
        },
        {
          $project: {
            seq: {
              $toLong: { $substrCP: [`$data.${field}`, prefix.length, 20] },
            },
          },
        },
        { $group: { _id: null, max: { $max: '$seq' } } },
      ])
      .toArray();
    return Number((maxDoc && maxDoc.max) || 0);
  };

  /** Next free `<prefix><zero-padded number>` value for the field: highest existing + 1, verified unused. */
  const nextValue = async (field, prefix, digits) => {
    let seq = await maxSequence(field, prefix);
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      seq += 1;
      const candidate = `${prefix}${String(seq).padStart(digits, '0')}`;
      if (!(await isUsedElsewhere(field, candidate))) {
        return candidate;
      }
    }
    throw new Error(
      `[records-case-identifiers] could not find a free ${field} with prefix ${prefix} after ${MAX_ATTEMPTS} attempts`
    );
  };

  /** Previous values of the fields, from the document pre-image (null on insert). */
  const getPrevious = () => {
    if (operationType === 'insert') {
      return null;
    }
    const before = changeEvent.fullDocumentBeforeChange;
    if (!before) {
      throw new Error(
        '[records-case-identifiers] fullDocumentBeforeChange is missing: enable "Document preimage" on the trigger and pre-images on the collection'
      );
    }
    const d = before.data || {};
    return {
      cecis_case: d.cecis_case,
      cecis_number: d.cecis_number,
      case_id: d.case_id,
    };
  };

  const data = fullDocument.data || {};
  const current = {
    cecis_case: data.cecis_case,
    cecis_number: data.cecis_number,
    case_id: data.case_id,
  };
  const previous = getPrevious();
  const target = { ...current };

  // ---------------------------------------------------------------------------
  // cecis_number
  // ---------------------------------------------------------------------------
  const isValidCecisNumber = (cecisCase, value) =>
    isBoolean(cecisCase) &&
    typeof value === 'string' &&
    CECIS_FORMATS[cecisCase].pattern.test(value);
  const nextCecisNumber = (cecisCase) =>
    nextValue(
      'cecis_number',
      CECIS_FORMATS[cecisCase].prefix,
      CECIS_FORMATS[cecisCase].digits
    );

  if (previous && isBoolean(previous.cecis_case)) {
    // cecis_case is locked once set: always keep the previous value.
    target.cecis_case = previous.cecis_case;
    if (isValidCecisNumber(target.cecis_case, previous.cecis_number)) {
      // The number is locked too.
      target.cecis_number = previous.cecis_number;
    } else if (
      isValidCecisNumber(target.cecis_case, current.cecis_number) &&
      !(await isUsedElsewhere('cecis_number', current.cecis_number))
    ) {
      // Number was missing and has just been provided (e.g. by the migration): accept it.
      target.cecis_number = current.cecis_number;
    } else {
      target.cecis_number = await nextCecisNumber(target.cecis_case);
    }
  } else if (isBoolean(current.cecis_case)) {
    // First time cecis_case is set.
    if (
      operationType !== 'insert' &&
      isValidCecisNumber(current.cecis_case, current.cecis_number) &&
      !(await isUsedElsewhere('cecis_number', current.cecis_number))
    ) {
      target.cecis_number = current.cecis_number;
    } else {
      // Inserts (including clones) always get a fresh number.
      target.cecis_number = await nextCecisNumber(current.cecis_case);
    }
  }

  // ---------------------------------------------------------------------------
  // case_id
  // ---------------------------------------------------------------------------
  const isValidCaseId = (value) =>
    typeof value === 'string' && CASE_ID_PATTERN.test(value);
  const caseIdPrefix = (military) => {
    const createdAt = fullDocument.createdAt
      ? new Date(fullDocument.createdAt)
      : new Date();
    return `${createdAt.getFullYear()}-${CASE_ID_LETTERS[military]}`;
  };

  if (previous && isValidCaseId(previous.case_id)) {
    // case_id is locked once assigned.
    target.case_id = previous.case_id;
  } else if (isBoolean(data.military)) {
    const prefix = caseIdPrefix(data.military);
    if (
      operationType !== 'insert' &&
      isValidCaseId(current.case_id) &&
      current.case_id.startsWith(prefix) &&
      !(await isUsedElsewhere('case_id', current.case_id))
    ) {
      // Provided with the right prefix (e.g. by the migration): accept it.
      target.case_id = current.case_id;
    } else {
      // Inserts (including clones) always get a fresh identifier.
      target.case_id = await nextValue('case_id', prefix, CASE_ID_DIGITS);
    }
  }

  // ---------------------------------------------------------------------------
  // Write back what changed
  // ---------------------------------------------------------------------------
  const $set = {};
  for (const field of ['cecis_case', 'cecis_number', 'case_id']) {
    if (target[field] !== current[field]) {
      $set[`data.${field}`] = target[field];
    }
  }
  if (!Object.keys($set).length) {
    // Nothing to change: this also stops the trigger re-firing on its own update.
    return;
  }

  await records.updateOne({ _id: documentKey._id }, { $set });
  console.log(
    `[records-case-identifiers] ${String(documentKey._id)}: ${JSON.stringify(
      $set
    )}`
  );
};
