/**
 * Configuration of back-office
 * Use https://www.npmjs.com/package/config package.
 */

 module.exports = {
    database: {
      provider: 'docker',
      prefix: 'mongodb',
      host: 'localhost',
      port: '27017',
      name: 'test',
      user: 'root',
      pass: '123',
    }
  };