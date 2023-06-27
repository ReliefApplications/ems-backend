import { startDatabaseForMigration } from '../src/utils/migrations/database.helper';
import { Dashboard } from '@models';
import { cloneDeep, isEqual } from 'lodash';
import { logger } from '@services/logger.service';

/**
 * Sample function of up migration
 *
 * @returns just migrate data.
 */
export const up = async () => {
  await startDatabaseForMigration();
  
  let dashboards = await Dashboard.find();
  const initDashboards = cloneDeep(dashboards);

   dashboards.forEach((dashboard: any) => {
      if(dashboard.structure){
         dashboard.structure.forEach((struc: any) => {
            if(struc.settings.floatingButtons){
               struc.settings.floatingButtons.forEach((btn: any) => {
                  btn.modifications.forEach((modification: any) => {
                     if(typeof modification.field !== 'string'){
                        modification.field = modification.field.name;
                     }
                  })
               })
            }
         })
      }
   })
   
   try {
      if (!isEqual(initDashboards, dashboards)) {
        logger.info('Updating modification field on dashboard fields');
        for (const dash of dashboards) {
         await Dashboard.findByIdAndUpdate(dash.id, {
            structure: dash.structure,
         });
        }
      }
    } catch (e) {
      logger.error('Error trying to save new modification field', e);
    }
};

/**
 * Sample function of down migration
 *
 * @returns just migrate data.
 */
export const down = async () => {
  /*
      Code you downgrade script here!
   */
};
