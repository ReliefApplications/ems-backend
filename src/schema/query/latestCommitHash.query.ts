import * as fs from 'fs';
import { GraphQLString } from 'graphql';
import * as path from 'path';

/**
 * Read latest remote commit hash from git repository
 *
 * @returns Commit hash
 */
export default {
  type: GraphQLString,
  async resolve() {
    try {
      const headFileContent = fs
        .readFileSync(path.join(path.resolve('.git'), 'ORIG_HEAD'), 'utf-8')
        .trim();
      return headFileContent;
    } catch (error) {
      console.error('Error occurred: ', error.message);
    }
  },
};
