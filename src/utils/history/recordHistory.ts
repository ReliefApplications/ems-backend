import { Record } from 'models';
import i18next from 'i18next';

type Change = {
  type: string;
  field: string;
  displayName: string;
  old?: any;
  new?: any;
};

/**
 * Class used to get a record's history
 */
export class RecordHistory {
  fields: any[] = [];

  /**
   * Initializes a RecordHistory object with the given record
   *
   * @param record the record to get the history from
   */
  constructor(private record: Record) {
    this.extractFields();
    // console.log('this.fields', JSON.stringify(this.fields, null, 2));
  }

  /**
   * Parses the structure of the record and
   * initializes the fields array
   */
  private extractFields() {
    if (!this.record.form || !this.record.form.structure) return;
    const structure = JSON.parse(this.record.form.structure);

    if (!structure.pages || !structure.pages.length) return;

    structure.pages.forEach((page) => {
      this.fields.push(...page.elements);
    });
  }

  /**
   * Gets the label or title for a given field name when available or the name itself when not
   *
   * @param key Name of the field
   * @param obj When provided, will get the title for the 'key' in the object field with name obj
   * @returns The display name for a field
   */
  private getDisplayName(key: string, obj?: string) {
    if (obj) {
      const field = this.fields.find((item) => item.name === obj);
      if (field) {
        const prop = field.items.find((item) => item.name === key);
        if (prop) return prop.title || prop.name;
      }
      return key;
    }
    const field = this.fields.find((item) => item.name === key);
    if (field) return field.title || field.name;
    return key;
  }

  /**
   * Gets the label or title for a given field value when available or the value itself when not
   *
   * @param key Name of the field
   * @param value Value of the field
   * @param obj When provided, will get the value for the 'key' in the object field with name obj
   * @returns the formatted value
   */
  private getDisplayValue(key: string, value: any, obj?: string) {
    // TODO: deal with all of the filed types
    if (obj) {
    }

    const field = this.fields.find((item) => item.name === key);
    switch (field.type) {
      case 'dropdown' || 'checkbox':
        const choice = field.choices.find((item) => item.value === value);
        return choice.text;
        break;
      default:
        return value;
    }
  }

  /**
   * Get the change object for field modification
   *
   * @param key The field name
   * @param after The subsequent version
   * @param current The current version
   * @returns The change object
   */
  private modifyField(key: string, after: any, current: any): Change {
    if (after[key] === null) {
      return {
        type: i18next.t('history.value.delete'),
        displayName: this.getDisplayName(key),
        field: key,
        old: current[key],
      };
    } else {
      return {
        type: 'Change value',
        displayName: this.getDisplayName(key),
        field: key,
        old: current[key],
        new: after[key],
      };
    }
  }

  /**
   * Get the change object for value insertion
   *
   * @param key The field name
   * @param current The current version
   * @returns The change object
   */
  private addField(key: string, current: any): Change {
    return {
      type: 'Add value',
      displayName: this.getDisplayName(key),
      field: key,
      new: current[key],
    };
  }

  /**
   * Get the change object for field modification
   *
   * @param after The subsequent version
   * @param current The current version
   * @param key The field name
   * @returns The change object
   */
  private modifyObjects(
    after: any,
    current: any,
    key: string
  ): Change | undefined {
    const afterKeys = Object.keys(after[key] ? after[key] : current[key]);

    const res: Change = {
      type: 'Change value',
      displayName: this.getDisplayName(key),
      field: key,
      old: {},
      new: {},
    };

    afterKeys.forEach((k) => {
      let afterValues = [];
      let currentValues = [];
      if (after[key] && after[key][k]) {
        if (after[key][k] instanceof Object) {
          afterValues = Object.values(after[key][k]);
        } else {
          afterValues = after[key][k];
        }
      }
      if (current[key] && current[key][k]) {
        if (current[key][k] instanceof Object) {
          currentValues = Object.values(current[key][k]);
        } else {
          currentValues = current[key][k];
        }
      }

      if (currentValues.toString() !== afterValues.toString()) {
        res.new[this.getDisplayName(k, key)] = afterValues;
        res.old[this.getDisplayName(k, key)] = currentValues;
      }
    });

    if (Object.keys(res.new).length > 0) return res;
  }

  /**
   * Get the change object for object field insertion
   *
   * @param current The current version
   * @param key The field name
   * @returns The change object
   */
  private addObject(current: any, key: string): Change {
    const currentKeys = Object.keys(current[key]);

    const res: Change = {
      type: 'Add value',
      displayName: this.getDisplayName(key),
      field: key,
      new: {},
    };

    currentKeys.forEach((k) => {
      let currentValues: any;
      if (current[key][k] instanceof Object) {
        currentValues = Object.values(current[key][k]);
      } else {
        currentValues = current[key][k];
      }
      res.new[this.getDisplayName(k, key)] = currentValues;
    });

    return res;
  }

  /**
   * Gets the difference between two versions of a record
   *
   * @param current initial version of the record
   * @param after subsequent version of the record
   * @returns The difference between the varsions
   */
  private getDifference(current: any, after: any) {
    const changes: Change[] = [];

    if (current) {
      const keysCurrent = Object.keys(current);
      keysCurrent.forEach((key) => {
        if (
          typeof after[key] === 'boolean' ||
          typeof current[key] === 'boolean'
        ) {
          if (current[key] !== null && after[key] !== current[key]) {
            changes.push(this.modifyField(key, after, current));
          }
        } else if (!Array.isArray(after[key]) && !Array.isArray(current[key])) {
          if (after[key]) {
            if (after[key] instanceof Object && current[key]) {
              const element = this.modifyObjects(after, current, key);
              if (element) {
                changes.push(element);
              }
            } else if (current[key] && after[key] !== current[key]) {
              changes.push(this.modifyField(key, after, current));
            }
          } else if (current[key]) {
            if (current[key] instanceof Object) {
              const element = this.modifyObjects(after, current, key);
              if (element) {
                changes.push(element);
              }
            } else if (after[key] !== current[key]) {
              changes.push(this.modifyField(key, after, current));
            } else {
              changes.push(this.addField(key, current));
            }
          }
        } else {
          if (
            (!after[key] && current[key]) ||
            (current[key] &&
              after[key] &&
              after[key].toString() !== current[key].toString())
          ) {
            changes.push(this.modifyField(key, after, current));
          } else if (!after[key] && current[key]) {
            changes.push(this.addField(key, current));
          }
        }
      });
    }

    const keysAfter = Object.keys(after);
    keysAfter.forEach((key) => {
      if (typeof after[key] === 'boolean') {
        if ((!current || current[key]) === null && after[key] !== null) {
          changes.push({
            type: 'Add value',
            displayName: this.getDisplayName(key),
            field: key,
            new: after[key],
          });
        }
      } else if (
        (!current || current[key] === null) &&
        !Array.isArray(after[key]) &&
        after[key] instanceof Object
      ) {
        const element = this.addObject(after, key);
        changes.push(element);
      } else if ((!current || current[key] === null) && after[key]) {
        changes.push({
          type: 'Add value',
          displayName: this.getDisplayName(key),
          field: key,
          new: after[key],
        });
      }
    });
    return changes;
  }

  /**
   * Gets the list of changes per version of a record
   *
   * @returns A list of changes
   */
  getHistory() {
    const res: {
      created: Date;
      createdBy: string;
      changes: Change[];
    }[] = [];
    const versions = this.record.versions || [];
    let difference: any;
    if (versions.length === 0) {
      difference = this.getDifference(null, this.record.data);
      res.push({
        created: this.record.createdAt,
        createdBy: this.record.createdBy?.name,
        changes: difference,
      });
      return res;
    }
    difference = this.getDifference(null, versions[0].data);
    res.push({
      created: versions[0].createdAt,
      createdBy: this.record.createdBy?.name,
      changes: difference,
    });
    for (let i = 1; i < versions.length; i++) {
      difference = this.getDifference(versions[i - 1].data, versions[i].data);
      res.push({
        created: versions[i].createdAt,
        createdBy: versions[i - 1].createdBy?.name,
        changes: difference,
      });
    }
    difference = this.getDifference(
      versions[versions.length - 1].data,
      this.record.data
    );
    res.push({
      created: this.record.modifiedAt,
      createdBy: versions[versions.length - 1].createdBy?.name,
      changes: difference,
    });
    return res.reverse();
  }
}

export default RecordHistory;
