import { Record, User, Role, ReferenceData } from '@models';
import {
  Change,
  RecordHistory as RecordHistoryType,
} from '@models/history.model';
import { AppAbility } from 'security/defineUserAbility';
import dataSources, { CustomAPI } from '../../server/apollo/dataSources';
import { isArray, memoize, pick } from 'lodash';
import { InMemoryLRUCache } from 'apollo-server-caching';
import { getFullChoices } from '@utils/form';

/**
 * Class used to get a record's history
 */
export class RecordHistory {
  fields: any[] = [];

  /**
   * Initializes a RecordHistory object with the given record
   *
   * @param record the record to get the history from
   * @param options options
   * @param options.translate the i18n function for translations
   * @param options.ability the users ability to see data
   * @param options.context apollo context
   */
  constructor(
    private record: Record,
    private options: {
      translate: (key: string) => string;
      ability: AppAbility;
      context?: any;
    }
  ) {
    this.getFields();
  }

  /**
   * Init dataSources in the case we're invoking this class from REST and not graphQL.
   */
  private async initDataSources(): Promise<void> {
    if (!this.options.context) {
      this.options.context = { dataSources: (await dataSources())() };
    }
  }

  /**
   * Get fields from the form
   */
  private getFields(): void {
    // No form, break the display
    if (!this.record.form) {
      this.fields = [];
    } else {
      // Take the fields from the form
      this.fields = this.record.form.fields;
      if (this.record.form.structure) {
        const structure = JSON.parse(this.record.form.structure);
        if (!structure.pages || !structure.pages.length) return;
        for (const page of structure.pages) {
          this.extractFields(page);
        }
      }
    }
  }

  /**
   * Extract fields from form structure in order to get titles.
   *
   * @param object structure to inspect, can be a page, a panel
   */
  private extractFields(object: any): void {
    if (object.elements) {
      for (const element of object.elements) {
        if (element.type === 'panel') {
          this.extractFields(element);
        } else {
          const field = this.fields.find((x) => x.name === element.name);
          if (field && element.title) {
            if (typeof element.title === 'string') {
              field.title = element.title;
            } else {
              field.title = element.title.default;
            }
          }
        }
      }
    }
  }

  /**
   * Gets the label or title for a given field name when available or the name itself when not
   *
   * @param key Name of the field
   * @returns The display name for a field
   */
  private getDisplayName(key: string) {
    const field = this.fields.find((item) => item.name === key);
    if (field) return field.title || field.name;
    return key;
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
        type: 'remove',
        displayType: this.options.translate('history.value.delete'),
        displayName: this.getDisplayName(key),
        field: key,
        old: current[key],
      };
    } else {
      return {
        type: 'modify',
        displayType: this.options.translate('history.value.change'),
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
      type: 'add',
      displayType: this.options.translate('history.value.add'),
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
      type: 'modify',
      displayType: this.options.translate('history.value.change'),
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
        res.new[k] = afterValues;
        res.old[k] = currentValues;
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
      type: 'add',
      displayType: this.options.translate('history.value.add'),
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
      res.new[k] = currentValues;
    });

    return res;
  }

  /**
   * Gets the difference between two versions of a record
   *
   * @param current initial version of the record
   * @param after subsequent version of the record
   * @returns The difference between the versions
   */
  private getDifference(current: any, after: any) {
    const changes: Change[] = [];

    if (current) {
      const keysCurrent = Object.keys(current);
      keysCurrent.forEach((key) => {
        const field = this.fields.find((f) => f.name === key);
        if (!field) {
          return;
        } else {
          if (
            typeof after[key] === 'boolean' ||
            typeof current[key] === 'boolean'
          ) {
            if (current[key] !== null && after[key] !== current[key]) {
              changes.push(this.modifyField(key, after, current));
            }
          } else if (
            !Array.isArray(after[key]) &&
            !Array.isArray(current[key])
          ) {
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
                JSON.stringify(after[key]) !== JSON.stringify(current[key]))
            ) {
              changes.push(this.modifyField(key, after, current));
            } else if (!after[key] && current[key]) {
              changes.push(this.addField(key, current));
            }
          }
        }
      });
    }

    const keysAfter = Object.keys(after);
    keysAfter.forEach((key) => {
      if (typeof after[key] === 'boolean') {
        if ((!current || current[key]) === null && after[key] !== null) {
          changes.push({
            type: 'add',
            displayType: this.options.translate('history.value.add'),
            displayName: this.getDisplayName(key),
            field: key,
            new: after[key],
          });
        }
      } else if (
        (!current || current[key] === null || current[key] === undefined) &&
        !Array.isArray(after[key]) &&
        after[key] instanceof Object &&
        !(after[key] instanceof Date)
      ) {
        const element = this.addObject(after, key);
        changes.push(element);
      } else if (
        (!current || current[key] === null || current[key] === undefined) &&
        after[key]
      ) {
        changes.push({
          type: 'add',
          displayType: this.options.translate('history.value.add'),
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
  async getHistory() {
    const res: RecordHistoryType = [];
    const versions =
      this.record.versions?.map((v) => ({
        ...v.toObject(),
        data: pick(v, this.record.accessibleFieldsBy(this.options.ability))
          .data,
      })) || [];
    const filteredData = pick(
      this.record,
      this.record.accessibleFieldsBy(this.options.ability)
    ).data;
    let difference: any;
    if (versions.length === 0) {
      difference = this.getDifference(null, filteredData);
      res.push({
        createdAt: this.record.createdAt,
        createdBy: this.record.createdBy?.user?.name,
        changes: difference,
      });

      const formatted = await this.formatValues(res);
      return formatted;
    }
    difference = this.getDifference(null, versions[0].data);
    res.push({
      createdAt: versions[0].createdAt,
      createdBy: this.record.createdBy?.user?.name,
      changes: difference,
      version: versions[0],
    });

    for (let i = 1; i < versions.length; i++) {
      difference = this.getDifference(versions[i - 1].data, versions[i].data);
      res.push({
        createdAt: versions[i].createdAt,
        createdBy: versions[i - 1].createdBy?.name,
        changes: difference,
        version: versions[i],
      });
    }
    difference = this.getDifference(
      versions[versions.length - 1].data,
      filteredData
    );
    res.push({
      createdAt: this.record.modifiedAt,
      createdBy: versions[versions.length - 1].createdBy?.name,
      changes: difference,
    });

    const formated = await this.formatValues(res.reverse());
    return formated;
  }

  /**
   * Formats and sets the display values for every question
   * of each version of the history
   *
   * @param history Record history to be formated
   * @returns The record history with formated values
   */
  private async formatValues(history: RecordHistoryType) {
    const getOptionFromChoices = (
      value: string,
      choices: { value: string; text: string }[] | string[]
    ) => {
      const choice = (choices as any[])?.find((c: any) =>
        c.value ? c.value == value : c == value
      );
      return choice === undefined ? value : choice.text ? choice.text : choice;
    };

    const getReferenceData = async (id: string) =>
      ReferenceData.findById(id).populate({
        path: 'apiConfiguration',
        model: 'ApiConfiguration',
        select: { name: 1, endpoint: 1, graphQLEndpoint: 1 },
      });
    const memoizedGetReferenceData = memoize(getReferenceData);

    // Format changes for selectable questions (dropdown, radiogroup, checkbox, tagbox), works for single and multiple selection
    const formatSelectable = async (field: any, change: Change) => {
      // If it's using reference Data, fetch the choices to display the display field
      if (field.referenceData) {
        const res = await Promise.all([
          await this.initDataSources(),
          memoizedGetReferenceData(field.referenceData.id),
        ]);
        const referenceData: ReferenceData = res[1];
        const dataSource: CustomAPI =
          this.options.context.dataSources[
            (referenceData.apiConfiguration as any)?.name
          ];
        if (dataSource && !dataSource.httpCache) {
          dataSource.initialize({
            context: this.options.context,
            cache: new InMemoryLRUCache(),
          });
        }
        const choices = dataSource
          ? await dataSource.getReferenceDataItems(
              referenceData,
              referenceData.apiConfiguration as any
            )
          : referenceData.data;
        ['old', 'new'].forEach((state) => {
          if (change[state] !== undefined) {
            if (isArray(change[state])) {
              const labels = change[state].map((item: string) => {
                const choiceId = referenceData.valueField;
                const selected = choices.find(
                  (choice: any) => choice[choiceId] === item
                );
                return selected
                  ? selected[field.referenceData.displayField]
                  : item;
              });
              change[state] = [...new Set(labels)];
            } else {
              const choiceId = referenceData.valueField;
              const selected = choices.find(
                (choice: any) => choice[choiceId] === change[state]
              );
              change[state] = selected
                ? selected[field.referenceData.displayField]
                : change[state];
            }
          }
        });
      } else {
        await this.initDataSources();
        // Otherwise, get the display value from choices stored in the field/choicesByUrl
        const choices = await getFullChoices(field, this.options.context);
        if (change.old !== undefined) {
          if (isArray(change.old)) {
            change.old = [
              ...new Set(
                change.old.map((item: string) =>
                  getOptionFromChoices(item, choices)
                )
              ),
            ];
          } else {
            change.old = getOptionFromChoices(change.old, choices);
          }
        }
        if (change.new !== undefined) {
          if (isArray(change.new)) {
            change.new = [
              ...new Set(
                change.new.map((item: string) =>
                  getOptionFromChoices(item, choices)
                )
              ),
            ];
          } else {
            change.new = getOptionFromChoices(change.new, choices);
          }
        }
      }
    };

    const getMatrixTextFromValue = (
      value: any,
      search: 'rows' | 'columns',
      field: any
    ) => {
      const elem = field[search].find((f) => f.name === value);
      if (!elem) return value;
      return elem.label;
    };

    const getTitleFromName = (
      name: string,
      array: { name: string; title: string }[]
    ) => {
      return array.find((c) => c.name === name).title;
    };

    const getResourcesIncrementalID = async (ids: string[]) => {
      const recordFilters = Record.accessibleBy(this.options.ability, 'read')
        .where({ _id: { $in: ids }, archived: { $ne: true } })
        .getFilter();
      const records: Record[] = await Record.find(recordFilters);
      return records.map((record) => record.incrementalId);
    };

    const getUsersFromID = async (ids: string[]) => {
      const userFilters = User.accessibleBy(this.options.ability, 'read')
        .where({ _id: { $in: ids }, archived: { $ne: true } })
        .getFilter();
      const users: User[] = await User.find(userFilters);
      return users.map((user) => user.username);
    };

    const getOwner = async (id: string) => {
      const roleFilters = Role.accessibleBy(this.options.ability, 'read')
        .where({ _id: id, archived: { $ne: true } })
        .getFilter();
      const role: Role = await Role.findOne(roleFilters).populate({
        path: 'application',
        model: 'Application',
      });
      return `${role.application.name} - ${role.title}`;
    };

    for (const version of history) {
      for (const change of version.changes) {
        const field = this.fields.find((f) => f.name === change.field);
        if (!field) continue;
        switch (field.type) {
          case 'boolean':
            if (change.old !== undefined)
              if (change.old)
                change.old = field.labelTrue ? field.labelTrue : change.old;
              else
                change.old = field.labelFalse ? field.labelFalse : change.old;

            if (change.new !== undefined)
              if (change.new)
                change.new = field.labelTrue ? field.labelTrue : change.new;
              else
                change.new = field.labelFalse ? field.labelFalse : change.new;
            break;
          case 'radiogroup':
          case 'dropdown':
          case 'tagbox':
          case 'checkbox':
            await formatSelectable(field, change);
            break;
          case 'file':
            if (change.old !== undefined)
              change.old = change.old.map((file: any) => file.name);
            if (change.new !== undefined)
              change.new = change.new.map((file: any) => file.name);
            break;
          case 'multipletext':
            ['new', 'old'].forEach((state) => {
              if (change[state] !== undefined) {
                const keys = Object.keys(change[state]);
                keys.forEach((key) => {
                  const newKey = getTitleFromName(key, field.items);
                  const valCpy = change[state][key];

                  delete change[state][key];
                  Object.assign(change[state], { [newKey]: valCpy });
                });
              }
            });
            break;
          case 'matrix':
            ['new', 'old'].forEach((state) => {
              if (change[state] !== undefined) {
                for (const key in change[state]) {
                  const newKey = getMatrixTextFromValue(key, 'rows', field);
                  const newVal = getMatrixTextFromValue(
                    change[state][key],
                    'columns',
                    field
                  );

                  delete change[state][key];
                  Object.assign(change[state], { [newKey]: newVal });
                }
              }
            });
            break;
          case 'matrixdropdown':
            ['new', 'old'].forEach((state) => {
              if (change[state] !== undefined) {
                const keys = Object.keys(change[state]);
                keys.forEach((key) => {
                  const newKey = getMatrixTextFromValue(key, 'rows', field);
                  const cols = field.columns.map((elem) => elem.label);

                  cols.forEach((col: string, i: number) => {
                    let newVal = change[state][key][i];
                    switch (field.columns[i].cellType) {
                      case 'radiogroup':
                      case 'dropdown':
                        newVal = getOptionFromChoices(newVal, field.choices);
                        break;
                      case 'checkbox':
                        newVal = newVal.map((item: string) =>
                          getOptionFromChoices(item, field.choices)
                        );
                    }
                    Object.assign(change[state], {
                      [`${newKey}.${col}`]: newVal,
                    });
                  });
                  delete change[state][key];
                });
              }
            });
            break;
          case 'matrixdynamic':
            ['new', 'old'].forEach((state) => {
              if (change[state] !== undefined) {
                const formatedState = [];
                for (const entry of change[state]) {
                  const newEntry = {};
                  for (const key in entry) {
                    const newKey = getTitleFromName(key, field.columns);
                    const newVal = getOptionFromChoices(
                      entry[key],
                      field.choices
                    );
                    Object.assign(newEntry, { [newKey]: newVal });
                  }
                  formatedState.push(newEntry);
                }

                const res: string[] = [];
                formatedState.forEach((entry, i) => {
                  let line = `[${i + 1}]`;
                  for (const key in entry) {
                    line = line.concat(`\t${key}: ${entry[key]}`).trim();
                  }
                  res.push(line);
                });
                change[state] = res.join('\n');
              }
            });
            break;
          case 'resource':
            if (change.old !== undefined)
              change.old = await getResourcesIncrementalID([change.old]);
            if (change.new !== undefined)
              change.new = await getResourcesIncrementalID([change.new]);
            break;
          // no break for the resources
          case 'resources':
            if (change.old !== undefined)
              change.old = await getResourcesIncrementalID(change.old);
            if (change.new !== undefined)
              change.new = await getResourcesIncrementalID(change.new);
            break;
          case 'users':
            if (change.old !== undefined)
              change.old = await getUsersFromID(change.old);
            if (change.new !== undefined)
              change.new = await getUsersFromID(change.new);
            break;
          case 'owner':
            if (change.old !== undefined)
              change.old = await getOwner(change.old);
            if (change.new !== undefined)
              change.new = await getOwner(change.new);
            break;
          case 'date':
            if (change.old !== undefined)
              change.old = new Date(change.old).toLocaleDateString();
            if (change.new !== undefined)
              change.new = new Date(change.new).toLocaleDateString();
            break;
          case 'datetime':
          case 'datetimelocal':
            if (change.old !== undefined)
              change.old = new Date(change.old).toLocaleString();
            if (change.new !== undefined)
              change.new = new Date(change.new).toLocaleString();
            break;
          case 'time':
            if (change.old !== undefined)
              change.old = new Date(change.old).toTimeString();
            if (change.new !== undefined)
              change.new = new Date(change.new).toTimeString();
            break;
          default:
            // for all other cases, keep the values
            break;
        }
      }
    }
    return history;
  }
}

export default RecordHistory;
