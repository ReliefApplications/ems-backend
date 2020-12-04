/*  Content of a Page or a Step
*/
import { GraphQLEnumType } from 'graphql';

export const contentType = {
    workflow: 'workflow',
    dashboard: 'dashboard',
    form: 'form',
};

export const ContentEnumType = new GraphQLEnumType({
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