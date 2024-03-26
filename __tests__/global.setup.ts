import 'tsconfig-paths/register';
import dotenv from 'dotenv';
dotenv.config();
import { startDatabase, initDatabase, stopDatabase } from '@server/database';
import config from 'config';
import { logger } from '@services/logger.service';
import { Role, User } from '@models';

const createUser = async () => {
  const user = await User.find({
    username: { $in: 'dummy@dummy.com' },
  });
  if (user.length > 0) await User.deleteMany({ username: 'dummy@dummy.com' });

  const admin = await new Role({ title: 'admin' }).save();
  const date = new Date();
  date.setDate(date.getDate() + 7);
  const newUser = await new User({
    username: 'dummy@dummy.com',
    roles: admin._id,
    // ability: SafeTestServer.defineUserAbilityMock(),
    deleteAt: date,
  }).save();
  return newUser;
};

/** Executes before all tests */
export default async () => {
  if (config.util.getEnv('NODE_ENV') !== 'production') {
    await startDatabase();
    logger.log({ level: 'info', message: '📶 Connected to database' });
    await createUser();
    await initDatabase();
    await stopDatabase();
  }
};
