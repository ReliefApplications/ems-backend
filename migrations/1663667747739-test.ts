import { getDb } from '../migrations-utils/db';
import { Application } from '../src/models';

getDb();

export const up = async () => {
  try {
    const applicationList = await Application.find();
    console.log('applicationList ==>> ', applicationList);
  } catch (err) {
    console.log('err ==>> ', err);
  }
};

export const down = async () => {
  /*
      Code you downgrade script here!
   */
};
