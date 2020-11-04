/*  Content of a Page or a Step
*/
const GraphQLEnumType = require('graphql').GraphQLEnumType;

const contentType = {
    workflow: 'workflow',
    dashboard: 'dashboard',
    form: 'form',
};

const ContentEnumType = new GraphQLEnumType({
    name: 'ContentEnumType',
    values: {
        workflow: {
            value: contentType.workflow
        },
        dashboard: {
            value: contentType.dashboard
        },
        form: {
            value: contentType.form
        }
    }
});

module.exports = {
    ContentEnumType,
    contentType
};