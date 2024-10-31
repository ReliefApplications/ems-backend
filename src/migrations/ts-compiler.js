/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable eol-last */
/* eslint-disable prettier/prettier */
const tsNode = require('ts-node');
require('tsconfig-paths/register');
module.exports = tsNode.register;