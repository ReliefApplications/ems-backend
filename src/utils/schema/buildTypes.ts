import { printSchema } from 'graphql';
import { getSchema } from './introspection/getSchema';
import { getReferenceDatas, getStructures } from './getStructures';
import { logger } from '../../services/logger.service';
import { getErrorMessage, getErrorStack } from '@utils/error';

/**
 * Build GraphQL types from the active resources / forms stored in the database.
 *
 * @returns The built GraphQL types
 */
const buildTypes = async (): Promise<string> => {
  try {
    const structures = await getStructures();
    const referenceDatas = await getReferenceDatas();

    const typeDefs = printSchema(getSchema(structures, referenceDatas));
    logger.info('🔨 Types generated.');

    return typeDefs;
  } catch (err) {
    logger.error(getErrorMessage(err), { stack: getErrorStack(err) });
    return;
  }
};

export default buildTypes;
