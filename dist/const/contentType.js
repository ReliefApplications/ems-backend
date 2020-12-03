"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentEnumType = exports.contentType = void 0;
/*  Content of a Page or a Step
*/
const graphql_1 = require("graphql");
exports.contentType = {
    workflow: 'workflow',
    dashboard: 'dashboard',
    form: 'form',
};
exports.ContentEnumType = new graphql_1.GraphQLEnumType({
    name: 'ContentEnumType',
    values: {
        workflow: {
            value: exports.contentType.workflow
        },
        dashboard: {
            value: exports.contentType.dashboard
        },
        form: {
            value: exports.contentType.form
        }
    }
});
//# sourceMappingURL=contentType.js.map