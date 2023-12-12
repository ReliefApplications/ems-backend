import config from 'config';
import fs from 'fs';

/**
 * Merge the who.js config with the who-XXX.js config and override the default config with the result
 *
 * Need to set ALLOW_CONFIG_MUTATIONS=true in the environment variables to allow the config to be mutated
 */
export const mergeWhoConfigs = () => {
  // Load the module who.js config
  const whoConfig = require('../../../config/who.js');

  // Find the file that start with who- and end with .js in the config folder
  fs.readdirSync('./config').forEach((file) => {
    if (file.startsWith('who-') && file.endsWith('.js')) {
      const whoXXXConfig = require('../../../config/' + file);
      // Override the default who.js config with the who-XXX.js config
      config.util.extendDeep(whoConfig, whoXXXConfig);
    }
  });

  // Override the default config with the who.js config
  config.util.extendDeep(config, whoConfig);
};
