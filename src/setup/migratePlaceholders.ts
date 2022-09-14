/* eslint-disable @typescript-eslint/no-loop-func */
import mongoose from 'mongoose';
import { Dashboard, Resource, PullJob, ReferenceData } from '../models';
import { startDatabase } from '../server/database';
import { Placeholder } from '../const/placeholders';

/** Regex for the pattern "today()+[number of days to add]" */
const REGEX_PLUS = new RegExp('today\\(\\)\\+\\d+');
/** Regex for the pattern "today()-[number of days to substract]" */
const REGEX_MINUS = new RegExp('today\\(\\)\\-\\d+');
/** String for REGEX_EMAIL */
const EMAIL = '({today}|{dataset})';
/** Regex for email placeholders */
const REGEX_EMAIL = new RegExp(EMAIL);

/**
 * Update value key from passed object by changing placeholder if any to new convention.
 *
 * @param obj Object to update.
 * @returns Boolean to specify if an update has been made or not.
 */
const updateValue = (obj: any): boolean => {
  if (obj.value === 'today()') {
    obj.value = Placeholder.TODAY;
    return true;
  }
  if (REGEX_PLUS.test(obj.value)) {
    const difference = obj.value.split('+')[1].trim();
    obj.value = `{{today+${difference}}}`;
    return true;
  }
  if (REGEX_MINUS.test(obj.value)) {
    const difference = obj.value.split('-')[1].trim();
    obj.value = `{{today-${difference}}}`;
    return true;
  }
  if (obj.value === 'now()') {
    obj.value = Placeholder.NOW;
    return true;
  }
  return false;
};

/** Migrate placeholders accross the whole system */
const migratePlaceholders = async () => {
  // === GRID ACTIONS ===
  console.log('\n=== GRID ACTIONS ===\n');
  // Fetch dashboards with actions involving plaeholders for auto-modify or send email.
  const dashboards = await Dashboard.find({
    'structure.name': 'Grid',
    $or: [
      {
        'structure.settings.floatingButtons.modifications.value': {
          $regex:
            '(today\\(\\)|today\\(\\)\\+\\d+|today\\(\\)\\-\\d+|now\\(\\))',
        },
      },
      {
        'structure.settings.floatingButtons': {
          $elemMatch: {
            $or: [
              {
                subject: { $regex: EMAIL },
              },
              {
                bodyText: { $regex: EMAIL },
              },
              {
                bodyTextAlternate: { $regex: EMAIL },
              },
            ],
          },
        },
      },
    ],
  });
  const actionsPromises: Promise<any>[] = [];
  for (const dashboard of dashboards) {
    for (const widget of dashboard.structure) {
      for (const floatingButton of widget.settings.floatingButtons) {
        // Auto modify action
        for (const modification of floatingButton.modifications) {
          if (updateValue(modification)) {
            dashboard.markModified('structure');
          }
        }
        // Email action
        for (const key of ['subject', 'bodyText', 'bodyTextAlternate']) {
          if (REGEX_EMAIL.test(floatingButton[key])) {
            floatingButton[key] = floatingButton[key].replace(
              '{today}',
              Placeholder.TODAY
            );
            floatingButton[key] = floatingButton[key].replace(
              '{dataset}',
              Placeholder.DATASET
            );
            dashboard.markModified('structure');
          }
        }
      }
    }
    actionsPromises.push(
      dashboard.save().then(
        () => {
          console.log('Dashboard "' + dashboard.name + '" actions updated.');
        },
        (err) => {
          console.log(
            'Could not update dashboard "' +
              dashboard.name +
              '" actions.\n' +
              err
          );
        }
      )
    );
  }
  await Promise.all(actionsPromises);

  // === LAYOUT FILTERS ===
  console.log('\n=== LAYOUT FILTERS ===\n');
  const resources = await Resource.find({
    'layouts.query.filter.filters': { $exists: true, $not: { $size: 0 } },
  });
  const layoutPromises: Promise<any>[] = [];
  const updateFilters = (filters: any): boolean => {
    let modified = false;
    if (filters.length > 0) {
      for (const filter of filters) {
        if (filter.value) {
          if (updateValue(filter)) {
            modified = true;
          }
        } else if (filter.filters) {
          if (updateFilters(filter.filters)) {
            modified = true;
          }
        }
      }
    }
    return modified;
  };
  for (const resource of resources) {
    let save = false;
    for (const layout of resource.layouts) {
      if (updateFilters(layout.query.filter.filters)) {
        save = true;
        resource.markModified('layouts');
      }
    }
    if (save) {
      layoutPromises.push(
        resource.save().then(
          () => {
            console.log('Resource "' + resource.name + '" layouts updated.');
          },
          (err) => {
            console.log(
              'Could not update resource "' +
                resource.name +
                '" layouts.\n' +
                err
            );
          }
        )
      );
    }
  }
  await Promise.all(layoutPromises);

  // === PULLJOB ===
  console.log('\n=== PULLJOB ===\n');
  const pullJobs = await PullJob.find({});
  const mappingPromises: Promise<any>[] = [];
  for (const pullJob of pullJobs) {
    let modified = false;
    for (const key in pullJob.mapping) {
      if (pullJob.mapping[key].startsWith('$$')) {
        pullJob.mapping[key] = '{{' + pullJob.mapping[key].slice(2) + '}}';
        modified = true;
      }
    }
    if (modified) {
      pullJob.markModified('mapping');
      mappingPromises.push(
        pullJob.save().then(
          () => {
            console.log('Pulljob "' + pullJob.name + '" mapping updated.');
          },
          (err) => {
            console.log(
              'Could not update pullJob "' + pullJob.name + '" mapping.\n' + err
            );
          }
        )
      );
    }
  }
  await Promise.all(mappingPromises);

  // === REFERENCE DATA ===
  console.log('\n=== REFERENCE DATA ===\n');
  const referenceDatas = await ReferenceData.find({
    graphQLFilter: { $regex: '\\$\\$' },
  });
  const refDataPromises: Promise<any>[] = [];
  for (const refData of referenceDatas) {
    refData.graphQLFilter = refData.graphQLFilter.replace(
      '$$LAST_UPDATE',
      Placeholder.LAST_UPDATE
    );
    refDataPromises.push(
      refData.save().then(
        () => {
          console.log(
            'Reference data "' + refData.name + '" graphQL filter updated.'
          );
        },
        (err) => {
          console.log(
            'Could not update reference data "' +
              refData.name +
              '" graphQL filter.\n' +
              err
          );
        }
      )
    );
  }
  await Promise.all(refDataPromises);
  console.log('\n=== MIGRATION COMPLETE ===');
};

// Start database with migration options
startDatabase({
  autoReconnect: true,
  reconnectInterval: 5000,
  reconnectTries: 3,
  poolSize: 10,
});
// Once connected, update forms
mongoose.connection.once('open', async () => {
  console.log('Connected to the database');
  await migratePlaceholders();
  mongoose.connection.close(() => {
    console.log('Connection closed');
  });
});
