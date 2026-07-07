import { Record, User, Role, ReferenceData, Version } from '@models';
import {
  Change,
  RecordHistory as RecordHistoryType,
} from '@models/history.model';
import { AppAbility } from 'security/defineUserAbility';
import { CustomAPI } from '../../server/apollo/dataSources';
import {
  differenceWith,
  get,
  isArray,
  isEqual,
  memoize,
  pick,
  startCase,
  isNil,
} from 'lodash';
import { getFullChoices } from '@utils/form';
import { accessibleBy } from '@casl/mongoose';
import { resolveLocalizedString } from '@utils/i18n/resolveLocalizedString';

/**
 * Class used to get a record's history
 */
export class RecordHistory {
  fields: any[] = [];

  /** Default number of history entries returned per page, when a limit is not specified */
  private static defaultPageLimit = 20;

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
   * Get fields from the form
   */
  private getFields(): void {
    // No form, break the display
    if (!this.record.resource) {
      this.fields = [];
    } else {
      // Take the fields from the form
      this.fields = this.record.resource.fields;
      if (this.record.form.structure) {
        const structure = JSON.parse(this.record.form.structure);
        if (!structure.pages || !structure.pages.length) return;
        for (const page of structure.pages) {
          this.extractFields(page);
        }
      }
      for (const field of this.fields) {
        if (!field.title) {
          field.title = startCase(field.name);
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
   * Get the change object for value insertion
   *
   * @param key The field name
   * @param next previous version
   * @returns The change object
   */
  private addEntry(key: string, next: any): Change {
    return {
      type: 'add',
      displayType: this.options.translate('history.value.add'),
      displayName: this.getDisplayName(key),
      field: key,
      new: get(next, key),
    };
  }

  /**
   * Edit an entry in the history
   *
   * @param key Field key
   * @param previous Previous value
   * @param next Next value
   * @returns History change
   */
  private editEntry(key: string, previous: any, next: any): Change {
    return {
      type: 'modify',
      displayType: this.options.translate('history.value.change'),
      displayName: this.getDisplayName(key),
      field: key,
      old: get(previous, key),
      new: get(next, key),
    };
  }

  /**
   * Delete an entry in the history
   *
   * @param key Field key
   * @param previous Previous value
   * @returns History change
   */
  private deleteEntry(key: string, previous: any): Change {
    return {
      type: 'remove',
      displayType: this.options.translate('history.value.delete'),
      displayName: this.getDisplayName(key),
      field: key,
      old: get(previous, key),
    };
  }

  /**
   * Gets the difference between two versions of a record
   *
   * @param previous previous value
   * @param next next value
   * @returns List of history changes
   */
  private getDifference(previous: any, next: any) {
    const changes: Change[] = [];
    // Previous version exists
    if (previous) {
      // Previous & next versions exist
      if (next) {
        const previousEntries = Object.entries(previous);
        const nextEntries = Object.entries(next);
        const previousDifferences = differenceWith(
          previousEntries,
          nextEntries,
          isEqual
        );
        const nextDifferences = differenceWith(
          nextEntries,
          previousEntries,
          isEqual
        );
        nextDifferences.forEach((diff) => {
          const key = diff[0];
          const field = this.fields.find((f) => f.name === key);
          if (!field) {
            // Cannot be converted to a field
            return;
          }
          const previousValue = get(previous, key);
          const nextValue = get(next, key);
          if (!isNil(nextValue)) {
            if (isNil(previousValue)) {
              changes.push(this.addEntry(key, next));
            } else {
              changes.push(this.editEntry(key, previous, next));
            }
          }
        });
        previousDifferences.forEach((diff) => {
          const key = diff[0];
          const field = this.fields.find((f) => f.name === key);
          if (!field) {
            // Cannot be converted to a field
            return;
          }
          const nextValue = get(next, key);
          if (isNil(nextValue)) {
            changes.push(this.deleteEntry(key, previous));
          } else {
            // Already tracked by previous block
          }
        });
      } else {
        // Only previous version exists (should not happen)
      }
    } else {
      // Only next version
      const nextEntries = Object.keys(next);
      for (const key of nextEntries) {
        if (!isNil(get(next, key))) {
          changes.push(this.addEntry(key, next));
        }
      }
    }
    return changes;
  }

  /**
   * Gets the list of changes per version of a record.
   *
   * Entries are chronologically indexed 0..N (N = number of stored versions):
   * entry 0 is the initial creation diff, entries 1..N-1 are diffs between
   * consecutive versions, and entry N is the diff between the last version
   * and the record's current data. The returned list is reversed so index 0
   * is the most recent change.
   *
   * When paginating or filtering, entries outside the date range or without
   * any remaining change are dropped, and skip / limit apply to the remaining
   * displayable entries: a page always contains up to `limit` non-empty
   * entries. Entries are computed most-recent-first in batches, fetching only
   * the version documents needed, until the page is filled or history is
   * exhausted.
   *
   * @param options optional options
   * @param options.skip number of history entries to skip
   * @param options.limit number of history entries per page
   * @param options.fields when provided, only keep changes on those fields
   * @param options.fromDate when provided, only keep entries from that date
   * @param options.toDate when provided, only keep entries up to that date
   * @returns A list of changes
   */
  async getHistory(options?: {
    skip?: number;
    limit?: number;
    fields?: string[];
    fromDate?: Date;
    toDate?: Date;
  }) {
    const fields = options?.fields?.length ? options.fields : undefined;
    const fromDate = options?.fromDate;
    const toDate = options?.toDate;
    const paginating =
      options?.skip !== undefined || options?.limit !== undefined;
    const skip = paginating ? options.skip || 0 : 0;
    const limit = paginating
      ? options.limit || RecordHistory.defaultPageLimit
      : Infinity;
    // Entries left without changes cannot be displayed, so they are dropped
    // whenever the caller paginates or filters, and don't count towards
    // skip / limit. Emptiness is only known after formatValues, which can
    // remove changes whose formatted old & new values are equal.
    const dropEmpty = paginating || !!fields;

    const applyFilters = (entries: RecordHistoryType) => {
      let filtered = entries;
      if (fromDate || toDate) {
        filtered = filtered.filter((entry) => {
          const date = new Date(entry.createdAt);
          return !(fromDate && date < fromDate) && !(toDate && date > toDate);
        });
      }
      if (fields) {
        for (const entry of filtered) {
          entry.changes = entry.changes.filter((change) =>
            fields.includes(change.field)
          );
        }
      }
      return filtered;
    };

    const filteredData = pick(
      this.record,
      this.record.accessibleFieldsBy(this.options.ability)
    ).data;
    const versionIds: any[] = this.record.versions || [];
    const N = versionIds.length;

    // No prior versions: the only possible entry is the creation of the record
    if (N === 0) {
      const changes = this.getDifference(null, filteredData);
      let entries: RecordHistoryType = [
        {
          createdAt: this.record.createdAt,
          createdBy: this.record._createdBy?.user?.name,
          changes,
        },
      ];
      entries = await this.formatValues(applyFilters(entries));
      if (dropEmpty) {
        entries = entries.filter((entry) => entry.changes.length);
      }
      return entries.slice(skip, skip + limit);
    }

    const result: RecordHistoryType = [];
    // Displayable entries encountered so far, to consume `skip`
    let seen = 0;
    // Reversed index of the next entry to compute (0 = most recent, N = creation)
    let nextR = 0;
    // The first batch covers exactly the requested window, so when no entry is
    // dropped a page costs a single versions query, as if slicing directly.
    // Follow-up batches double in size to bound the number of queries when
    // most entries are filtered out.
    let batchSize = Math.min(skip + limit, N + 1);
    while (nextR <= N && result.length < limit) {
      const rStart = nextR;
      const rEnd = Math.min(nextR + batchSize - 1, N);
      nextR = rEnd + 1;
      batchSize *= 2;

      const raw = await this.getEntries(
        N - rEnd,
        N - rStart,
        versionIds,
        filteredData
      );
      // Entries are ordered most recent first: once one is older than
      // fromDate, all the remaining history is out of range too
      const exhausted =
        fromDate && raw.some((entry) => new Date(entry.createdAt) < fromDate);
      const formatted = await this.formatValues(applyFilters(raw));
      for (const entry of formatted) {
        if (dropEmpty && !entry.changes.length) continue;
        if (seen >= skip && result.length < limit) {
          result.push(entry);
        }
        seen++;
      }
      if (exhausted) break;
    }
    return result;
  }

  /**
   * Builds the raw (unformatted) history entries for the chronological
   * indices [eMin, eMax], fetching only the version documents strictly
   * required to compute that range.
   *
   * @param eMin first chronological entry index (0 = creation diff)
   * @param eMax last chronological entry index (N = current data diff)
   * @param versionIds ids of all the record's versions, in chronological order
   * @param filteredData record's current data, restricted to accessible fields
   * @returns The entries for the range, most recent first
   */
  private async getEntries(
    eMin: number,
    eMax: number,
    versionIds: any[],
    filteredData: any
  ): Promise<RecordHistoryType> {
    const N = versionIds.length;
    // Only fetch the version documents strictly needed to compute entries [eMin, eMax]
    const vStart = Math.max(0, eMin - 1);
    const vEnd = Math.min(N - 1, eMax);
    const neededIds = versionIds.slice(vStart, vEnd + 1);

    const fetchedVersions = await Version.find({
      _id: { $in: neededIds },
    }).populate({ path: 'createdBy', model: 'User' });
    const fetchedById = new Map(
      fetchedVersions.map((v: any) => [String(v._id), v])
    );
    // Mongo doesn't preserve $in order, so re-map to match neededIds
    const versions = neededIds.map((id) => {
      const v = fetchedById.get(String(id));
      return {
        ...v.toObject({ minimize: false }),
        data: pick(v, this.record.accessibleFieldsBy(this.options.ability))
          .data,
      };
    });
    // versions[idx - vStart] is the version at original array index `idx`
    const getVersion = (idx: number) => versions[idx - vStart];

    const res: RecordHistoryType = [];
    for (let e = eMin; e <= eMax; e++) {
      if (e === 0) {
        const v0 = getVersion(0);
        res.push({
          createdAt: v0.createdAt,
          createdBy: this.record._createdBy?.user?.name,
          changes: this.getDifference(null, v0.data),
          version: v0,
        });
      } else if (e === N) {
        const vLast = getVersion(N - 1);
        res.push({
          createdAt: this.record.modifiedAt,
          createdBy: vLast.createdBy?.name,
          changes: this.getDifference(vLast.data, filteredData),
        });
      } else {
        const vPrev = getVersion(e - 1);
        const vCurr = getVersion(e);
        res.push({
          createdAt: vCurr.createdAt,
          createdBy: vPrev.createdBy?.name,
          changes: this.getDifference(vPrev.data, vCurr.data),
          version: vCurr,
        });
      }
    }

    return res.reverse();
  }

  /**
   * Formats and sets the display values for every question
   * of each version of the history
   *
   * @param history Record history to be formated
   * @returns The record history with formated values
   */
  private async formatValues(history: RecordHistoryType) {
    const locale = this.options.context?.locale;
    const getOptionFromChoices = (
      value: string,
      choices: { value: string; text: string }[] | string[]
    ) => {
      const choice = (choices as any[])?.find((c: any) =>
        c.value ? c.value == value : c == value
      );
      if (choice === undefined) return value;
      // choice.text may be a plain string or a localized map ({ default, ua, ... }),
      // resolve it to the requested locale before displaying.
      return choice.text ? resolveLocalizedString(choice.text, locale) : choice;
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
        const referenceData: ReferenceData = await memoizedGetReferenceData(
          field.referenceData.id
        );
        const dataSource: CustomAPI =
          this.options.context.dataSources[
            (referenceData.apiConfiguration as any)?.name
          ];
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

    const getLabelFromName = (
      name: string,
      array: { name: string; label: string }[]
    ) => {
      return array.find((c) => c.name === name).label;
    };

    const getResourcesIncrementalID = async (ids: string[]) => {
      const recordFilters = Record.find(
        accessibleBy(this.options.ability, 'read').Record
      )
        .where({ _id: { $in: ids }, archived: { $ne: true } })
        .getFilter();
      const records: Record[] = await Record.find(recordFilters);
      return records.map((record) => record.incrementalId);
    };

    const getUsersFromID = async (ids: string[]) => {
      const userFilters = User.find(
        accessibleBy(this.options.ability, 'read').User
      )
        .where({ _id: { $in: ids }, archived: { $ne: true } })
        .getFilter();
      const users: User[] = await User.find(userFilters);
      return users.map((user) => user.username);
    };

    const getOwner = async (id: string) => {
      const roleFilters = Role.find(
        accessibleBy(this.options.ability, 'read').Role
      )
        .where({ _id: id, archived: { $ne: true } })
        .getFilter();
      const role: Role = await Role.findOne(roleFilters).populate({
        path: 'application',
        model: 'Application',
      });
      return role ? `${role.application?.name} - ${role.title}` : '';
    };

    for (const version of history) {
      for (let j = version.changes.length - 1; j >= 0; j--) {
        const change = version.changes[j];
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
            if (!isNil(change.old))
              change.old = change.old.map((file: any) => file.name);
            if (!isNil(change.new))
              change.new = change.new.map((file: any) => file.name);
            break;
          case 'multipletext':
            ['new', 'old'].forEach((state) => {
              if (change[state] !== undefined) {
                const keys = Object.keys(change[state]);
                keys.forEach((key) => {
                  const newKey = getLabelFromName(key, field.items);
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
          case 'datetime-local':
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
        // In case of modification, check that old & new are really different
        if (change.old !== undefined && change.new !== undefined) {
          if (isEqual(change.old, change.new)) {
            version.changes.splice(j, 1);
          }
        }
      }
    }
    return history;
  }
}

export default RecordHistory;
