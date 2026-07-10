import { EventEmitter } from 'events';
import { Form, ReferenceData, Resource } from '@models';
import {
  formChangeRequiresSchemaReload,
  listenToSchemaUpdateTriggers,
  referenceDataChangeRequiresSchemaReload,
  resourceChangeRequiresSchemaReload,
  resourceUpdateRequiresSchemaReload,
} from '@server/schemaUpdateTriggers';

jest.mock('@models', () => ({
  Form: { watch: jest.fn() },
  ReferenceData: { watch: jest.fn() },
  Resource: { watch: jest.fn() },
}));

describe('resourceUpdateRequiresSchemaReload', () => {
  describe('positional array updates (dotted keys)', () => {
    it('should reload when a calculated field is added to the fields array', () => {
      // Shape emitted by the change stream when a new field is pushed
      const updatedFields = {
        modifiedAt: new Date('2026-07-07'),
        'fields.19': {
          name: 'total',
          type: 'text',
          isCalculated: true,
          expression: '{ "$sum": "$data.amount" }',
        },
      };

      expect(resourceUpdateRequiresSchemaReload(updatedFields)).toBe(true);
    });

    it('should not reload when a non-calculated field is added', () => {
      const updatedFields = {
        modifiedAt: new Date('2026-07-07'),
        'fields.3': { name: 'comment', type: 'text' },
      };

      expect(resourceUpdateRequiresSchemaReload(updatedFields)).toBe(false);
    });

    it('should not reload when the positional value is not an object', () => {
      const updatedFields = { 'fields.19.expression': 'today()' };

      expect(resourceUpdateRequiresSchemaReload(updatedFields)).toBe(false);
    });
  });

  describe('whole-array updates', () => {
    it('should reload when the fields array contains a calculated field', () => {
      const updatedFields = {
        fields: [
          { name: 'name', type: 'text' },
          { name: 'total', type: 'text', isCalculated: true },
        ],
      };

      expect(resourceUpdateRequiresSchemaReload(updatedFields)).toBe(true);
    });

    it('should not reload when no field of the array is calculated', () => {
      const updatedFields = {
        fields: [
          { name: 'name', type: 'text' },
          { name: 'comment', type: 'text' },
        ],
      };

      expect(resourceUpdateRequiresSchemaReload(updatedFields)).toBe(false);
    });

    it('should ignore null entries in the fields array', () => {
      const updatedFields = { fields: [null, { name: 'name' }] };

      expect(resourceUpdateRequiresSchemaReload(updatedFields)).toBe(false);
    });
  });

  describe('unrelated updates', () => {
    it('should not reload when only unrelated fields are updated', () => {
      const updatedFields = {
        modifiedAt: new Date('2026-07-07'),
        name: 'Renamed resource',
        permissions: { canSee: [] },
      };

      expect(resourceUpdateRequiresSchemaReload(updatedFields)).toBe(false);
    });

    it('should not match keys that merely start with "fields"', () => {
      const updatedFields = { fieldsets: [{ isCalculated: true }] };

      expect(resourceUpdateRequiresSchemaReload(updatedFields)).toBe(false);
    });

    it('should not reload on an empty update description', () => {
      expect(resourceUpdateRequiresSchemaReload({})).toBe(false);
    });
  });
});

describe('formChangeRequiresSchemaReload', () => {
  it('should reload on insert and delete', () => {
    expect(formChangeRequiresSchemaReload({ operationType: 'insert' })).toBe(
      true
    );
    expect(formChangeRequiresSchemaReload({ operationType: 'delete' })).toBe(
      true
    );
  });

  it.each(['name', 'status', 'structure'])(
    'should reload when %s is updated',
    (key) => {
      const data = {
        operationType: 'update',
        updateDescription: { updatedFields: { [key]: 'new value' } },
      };

      expect(formChangeRequiresSchemaReload(data)).toBe(true);
    }
  );

  it('should not reload when only unrelated fields are updated', () => {
    const data = {
      operationType: 'update',
      updateDescription: {
        updatedFields: { modifiedAt: new Date('2026-07-07') },
      },
    };

    expect(formChangeRequiresSchemaReload(data)).toBe(false);
  });

  it('should only match whole-field updates, not dotted keys', () => {
    const data = {
      operationType: 'update',
      updateDescription: {
        updatedFields: { 'structure.pages': [] },
      },
    };

    expect(formChangeRequiresSchemaReload(data)).toBe(false);
  });
});

describe('referenceDataChangeRequiresSchemaReload', () => {
  it.each(['name', 'type', 'apiConfiguration', 'fields', 'data'])(
    'should reload when %s is updated',
    (key) => {
      const data = {
        operationType: 'update',
        updateDescription: { updatedFields: { [key]: 'new value' } },
      };

      expect(referenceDataChangeRequiresSchemaReload(data)).toBe(true);
    }
  );

  it('should not reload on positional updates of fields or data (dotted keys)', () => {
    const data = {
      operationType: 'update',
      updateDescription: {
        updatedFields: { 'data.42': { id: 42 } },
      },
    };

    expect(referenceDataChangeRequiresSchemaReload(data)).toBe(false);
  });

  it('should not reload when only unrelated fields are updated', () => {
    const data = {
      operationType: 'update',
      updateDescription: {
        updatedFields: { modifiedAt: new Date('2026-07-07') },
      },
    };

    expect(referenceDataChangeRequiresSchemaReload(data)).toBe(false);
  });

  it('should not reload on other operation types', () => {
    expect(
      referenceDataChangeRequiresSchemaReload({ operationType: 'insert' })
    ).toBe(false);
  });
});

describe('resourceChangeRequiresSchemaReload', () => {
  it('should reload on delete', () => {
    expect(
      resourceChangeRequiresSchemaReload({ operationType: 'delete' })
    ).toBe(true);
  });

  it('should reload when a calculated field is updated', () => {
    const data = {
      operationType: 'update',
      updateDescription: {
        updatedFields: { 'fields.19': { name: 'total', isCalculated: true } },
      },
    };

    expect(resourceChangeRequiresSchemaReload(data)).toBe(true);
  });

  it('should not reload when a non-calculated field is updated', () => {
    const data = {
      operationType: 'update',
      updateDescription: {
        updatedFields: { 'fields.3': { name: 'comment' } },
      },
    };

    expect(resourceChangeRequiresSchemaReload(data)).toBe(false);
  });

  it('should not reload on insert', () => {
    expect(
      resourceChangeRequiresSchemaReload({ operationType: 'insert' })
    ).toBe(false);
  });
});

describe('listenToSchemaUpdateTriggers', () => {
  let formStream: EventEmitter;
  let referenceDataStream: EventEmitter;
  let resourceStream: EventEmitter;
  const onSchemaUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    formStream = new EventEmitter();
    referenceDataStream = new EventEmitter();
    resourceStream = new EventEmitter();
    (Form.watch as jest.Mock).mockReturnValue(formStream);
    (ReferenceData.watch as jest.Mock).mockReturnValue(referenceDataStream);
    (Resource.watch as jest.Mock).mockReturnValue(resourceStream);
    listenToSchemaUpdateTriggers(onSchemaUpdate);
  });

  it('should watch the form, reference data and resource collections', () => {
    expect(Form.watch).toHaveBeenCalledTimes(1);
    expect(ReferenceData.watch).toHaveBeenCalledTimes(1);
    expect(Resource.watch).toHaveBeenCalledTimes(1);
  });

  it('should trigger the callback on relevant changes', () => {
    formStream.emit('change', { operationType: 'insert' });
    referenceDataStream.emit('change', {
      operationType: 'update',
      updateDescription: { updatedFields: { name: 'Countries' } },
    });
    resourceStream.emit('change', { operationType: 'delete' });

    expect(onSchemaUpdate).toHaveBeenCalledTimes(3);
  });

  it('should not trigger the callback on irrelevant changes', () => {
    formStream.emit('change', {
      operationType: 'update',
      updateDescription: {
        updatedFields: { modifiedAt: new Date('2026-07-07') },
      },
    });
    referenceDataStream.emit('change', { operationType: 'delete' });
    resourceStream.emit('change', {
      operationType: 'update',
      updateDescription: {
        updatedFields: { 'fields.3': { name: 'comment' } },
      },
    });

    expect(onSchemaUpdate).not.toHaveBeenCalled();
  });
});
