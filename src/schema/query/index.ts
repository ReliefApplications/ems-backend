import { GraphQLObjectType } from 'graphql';
import resources from './resources';
import resource from './resource';
import notifications from './notifications';
import forms from './forms';
import form from './form';
import records from './records';
import record from './record';
import recordsAggregation from './recordsAggregation';
import dashboards from './dashboards';
import dashboard from './dashboard';
import users from './users';
import me from './me';
import roles from './roles';
import step from './step';
import steps from './steps';
import workflow from './workflow';
import workflows from './workflows';
import page from './page';
import pages from './pages';
import application from './application';
import applications from './applications';
import permissions from './permissions';
import channels from './channels';
import positionAttributes from './positionAttributes';
import clients from './clients';
import apiConfiguration from './apiConfiguration';
import apiConfigurations from './apiConfigurations';

// === QUERIES ===
const Query = new GraphQLObjectType({
    name: 'Query',
    fields: {
        apiConfiguration,
        apiConfigurations,
        application,
        applications,
        channels,
        dashboard,
        dashboards,
        form,
        forms,
        me,
        notifications,
        page,
        pages,
        permissions,
        record,
        records,
        recordsAggregation,
        resource,
        resources,
        roles,
        step,
        steps,
        users,
        workflow,
        workflows,
        positionAttributes,
        clients
    }
});

export default Query;