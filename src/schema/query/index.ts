import { GraphQLObjectType } from 'graphql';
import resources from './resources.query';
import resource from './resource.query';
import notifications from './notifications.query';
import forms from './forms.query';
import form from './form.query';
import records from './records.query';
import record from './record.query';
import recordsAggregation from './recordsAggregation.query';
import dashboards from './dashboards.query';
import dashboard from './dashboard.query';
import users from './users.query';
import me from './me.query';
import role from './role.query';
import roles from './roles.query';
import rolesFromApplications from './rolesFromApplications.query';
import step from './step.query';
import steps from './steps.query';
import workflow from './workflow.query';
import workflows from './workflows.query';
import page from './page.query';
import pages from './pages.query';
import application from './application.query';
import applications from './applications.query';
import permissions from './permissions.query';
import channels from './channels.query';
import positionAttributes from './positionAttributes.query';
import apiConfiguration from './apiConfiguration.query';
import apiConfigurations from './apiConfigurations.query';
import pullJobs from './pullJobs.query';
import referenceData from './referenceData.query';
import referenceDatas from './referenceDatas.query';
import recordHistory from './recordHistory.query';
import user from './user.query';
import group from './group.query';
import groups from './groups.query';
import layers from './layers.query';
import layer from './layer.query';
import draftRecords from './draftRecords.query';
import referenceDataAggregation from './referenceDataAggregation.query';
import emailNotification from './emailNotification.query';
import emailNotifications from './emailNotifications.query';
import types from './types.query';
import activityLog from './activityLog.query';
import activityLogs from './activityLogs.query';
import emailDistributionLists from './emailDistributionList.query';
import customTemplates from './customTemplates.query';
import activityLogsByUrl from './activityLogsByUrl.query';

/** GraphQL query type definition */
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
    emailNotification,
    emailNotifications,
    form,
    forms,
    group,
    groups,
    me,
    notifications,
    page,
    pages,
    permissions,
    pullJobs,
    record,
    records,
    recordsAggregation,
    referenceData,
    referenceDatas,
    referenceDataAggregation,
    resource,
    resources,
    role,
    roles,
    rolesFromApplications,
    step,
    steps,
    types,
    user,
    users,
    workflow,
    workflows,
    positionAttributes,
    recordHistory,
    layers,
    layer,
    draftRecords,
    activityLog,
    activityLogs,
    activityLogsByUrl,
    emailDistributionLists,
    customTemplates,
  },
});

export default Query;
