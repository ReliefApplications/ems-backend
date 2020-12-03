/*  Content of a Page or a Step
*/
import { GraphQLEnumType } from 'graphql';

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

export default {
    ContentEnumType,
    contentType
};