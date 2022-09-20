import { startDatabase } from '../src/server/database';
export const getDb = async () => {
  startDatabase({
    autoReconnect: true,
    reconnectInterval: 5000,
    reconnectTries: 3,
    poolSize: 10,
  });
};
