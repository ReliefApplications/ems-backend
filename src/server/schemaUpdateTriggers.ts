import { Form, ReferenceData, Resource } from '@models';

/** Change event emitted by a collection watch stream */
interface CollectionChange {
  operationType?: string;
  updateDescription?: {
    updatedFields?: Record<string, any>;
  };
}

/**
 * Checks whether a resource update requires the GraphQL schema to be rebuilt,
 * i.e. whether calculated fields were added or replaced.
 *
 * Change streams report partial array updates with dotted keys
 * (e.g. 'fields.19' when a single field is added or replaced), so both the
 * whole-array form ('fields') and the positional form ('fields.<index>') are
 * handled.
 *
 * @param updatedFields updatedFields object from the change stream's updateDescription
 * @returns true if the schema should be reloaded
 */
export const resourceUpdateRequiresSchemaReload = (
  updatedFields: Record<string, any>
): boolean =>
  Object.keys(updatedFields).some((key) => {
    if (key !== 'fields' && !key.startsWith('fields.')) {
      return false;
    }
    const value = updatedFields[key];
    if (Array.isArray(value)) {
      return value.some((field) => field?.isCalculated === true);
    }
    return value?.isCalculated === true;
  });

/**
 * Checks whether a form change requires the GraphQL schema to be rebuilt.
 * Insertions and deletions always do; updates only when the name, status or
 * structure changed.
 *
 * @param data change event from the form collection watch stream
 * @returns true if the schema should be reloaded
 */
export const formChangeRequiresSchemaReload = (
  data: CollectionChange
): boolean => {
  if (data.operationType === 'insert' || data.operationType === 'delete') {
    return true;
  }
  if (data.operationType === 'update') {
    const fieldsThatRequireSchemaUpdate = ['name', 'status', 'structure'];
    return Object.keys(data.updateDescription?.updatedFields ?? {}).some(
      (key) => fieldsThatRequireSchemaUpdate.includes(key)
    );
  }
  return false;
};

/**
 * Checks whether a reference data change requires the GraphQL schema to be
 * rebuilt, i.e. whether its name, type, api configuration, fields or data
 * changed. Only whole-field updates are considered: positional updates
 * (e.g. 'data.42') do not trigger a reload.
 *
 * @param data change event from the reference data collection watch stream
 * @returns true if the schema should be reloaded
 */
export const referenceDataChangeRequiresSchemaReload = (
  data: CollectionChange
): boolean => {
  if (data.operationType === 'update') {
    const fieldsThatRequireSchemaUpdate = [
      'name',
      'type',
      'apiConfiguration',
      'fields',
      'data',
    ];
    return Object.keys(data.updateDescription?.updatedFields ?? {}).some(
      (key) => fieldsThatRequireSchemaUpdate.includes(key)
    );
  }
  return false;
};

/**
 * Checks whether a resource change requires the GraphQL schema to be rebuilt.
 * Deletions always do; updates only when calculated fields were added or
 * replaced.
 *
 * @param data change event from the resource collection watch stream
 * @returns true if the schema should be reloaded
 */
export const resourceChangeRequiresSchemaReload = (
  data: CollectionChange
): boolean => {
  if (data.operationType === 'delete') {
    return true;
  }
  if (data.operationType === 'update') {
    return resourceUpdateRequiresSchemaReload(
      data.updateDescription?.updatedFields ?? {}
    );
  }
  return false;
};

/**
 * Watches the collections that define the GraphQL schema and invokes the
 * given callback whenever a change requires the schema to be rebuilt.
 *
 * @param onSchemaUpdate callback triggering the schema rebuild
 */
export const listenToSchemaUpdateTriggers = (
  onSchemaUpdate: () => void
): void => {
  Form.watch().on('change', (data) => {
    if (formChangeRequiresSchemaReload(data)) {
      onSchemaUpdate();
    }
  });
  ReferenceData.watch().on('change', (data) => {
    if (referenceDataChangeRequiresSchemaReload(data)) {
      onSchemaUpdate();
    }
  });
  Resource.watch().on('change', (data) => {
    if (resourceChangeRequiresSchemaReload(data)) {
      onSchemaUpdate();
    }
  });
};
