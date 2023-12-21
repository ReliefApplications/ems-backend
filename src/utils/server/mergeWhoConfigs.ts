import config from 'config';
import fs from 'fs/promises';

/**
 * Merge the who.js config with the who-XXX.js config and override the default config with the result
 *
 * Need to set ALLOW_CONFIG_MUTATIONS=true in the environment variables to allow the config to be mutated
 */
export const mergeWhoConfigs = async () => {
  try {
    // Load the module who.js config
    const whoConfigModule = await import('../../../config/who');
    const whoConfig = whoConfigModule.default || whoConfigModule;

    // Find the file that starts with who- and ends with .js in the config folder
    const files = await fs.readdir('./config');
    for (const file of files) {
      if (file.startsWith('who-') && file.endsWith('.js')) {
        // Import the who-XXX.js config
        const whoXXXConfigModule = await import('../../../config/' + file);
        const whoXXXConfig = whoXXXConfigModule.default || whoXXXConfigModule;
        // Override the default who.js config with the who-XXX.js config
        config.util.extendDeep(whoConfig, whoXXXConfig);
      }
    }

    // Override the default config with the who.js config
    config.util.extendDeep(config, whoConfig);
  } catch (error) {
    console.error('Error merging configurations:', error);
  }
};
