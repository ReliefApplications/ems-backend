import config from 'config';

/** Initializes any WHO config */
export const initWHOConfig = async () => {
  const nodeEnv =
    config.util.getEnv('NODE_CONFIG_ENV') ?? config.util.getEnv('NODE_ENV');
  const isWhoEnv = nodeEnv.toLocaleLowerCase().startsWith('who');

  if (!isWhoEnv) {
    return;
  }

  // The NODE_CONFIG_ENV environment variable is set to 'who-XXX'
  // So the server already has the who-XXX.js config
  // we only need to extend the who one
  const getFileConfig = async (filename) => {
    try {
      const conf = await import(
        config.util.getEnv('NODE_CONFIG_DIR') + '/' + filename
      );
      return conf?.default || {};
    } catch (_) {
      return {};
    }
  };

  // Extend the default config with the who.js config
  config.util.extendDeep(
    // Base is the default + nodeEnv
    config,
    // Extend with who
    await getFileConfig('who'),
    // Reapply the nodeEnv config
    await getFileConfig(nodeEnv)
  );
};
