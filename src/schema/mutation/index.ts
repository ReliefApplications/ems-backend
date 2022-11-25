import { GraphQLObjectType } from 'graphql';
import deleteResource from './deleteResource.mutation';
import addForm from './addForm.mutation';
import editForm from './editForm.mutation';
import editResource from './editResource.mutation';
import deleteForm from './deleteForm.mutation';
import addRecord from './addRecord.mutation';
import editRecord from './editRecord.mutation';
import editRecords from './editRecords.mutation';
import deleteRecord from './deleteRecord.mutation';
import deleteRecords from './deleteRecords.mutation';
import convertRecord from './convertRecord.mutation';
import restoreRecord from './restoreRecord.mutation';
import addDashboard from './addDashboard.mutation';
import editDashboard from './editDashboard.mutation';
import deleteDashboard from './deleteDashboard.mutation';
import addRole from './addRole.mutation';
import editRole from './editRole.mutation';
import deleteRole from './deleteRole.mutation';
import editUser from './editUser.mutation';
import deleteUsers from './deleteUsers.mutation';
import deleteUsersFromApplication from './deleteUsersFromApplication.mutation';
import addRoleToUsers from './addRoleToUsers.mutation';
import addApplication from './addApplication.mutation';
import editApplication from './editApplication.mutation';
import deleteApplication from './deleteApplication.mutation';
import addPage from './addPage.mutation';
import editPage from './editPage.mutation';
import deletePage from './deletePage.mutation';
import addWorkflow from './addWorkflow.mutation';
import editWorkflow from './editWorkflow.mutation';
import deleteWorkflow from './deleteWorkflow.mutation';
import addStep from './addStep.mutation';
import editStep from './editStep.mutation';
import deleteStep from './deleteStep.mutation';
import seeNotification from './seeNotification.mutation';
import seeNotifications from './seeNotifications.mutation';
import publishNotification from './publishNotification.mutation';
import addChannel from './addChannel.mutation';
import editChannel from './editChannel.mutation';
import deleteChannel from './deleteChannel.mutation';
import publish from './publish.mutation';
import addSubscription from './addSubscription.mutation';
import deleteSubscription from './deleteSubscription.mutation';
import editSubscription from './editSubscription.mutation';
import duplicateApplication from './duplicateApplication.mutation';
import addPositionAttributeCategory from './addPositionAttributeCategory.mutation';
import addPositionAttribute from './addPositionAttribute.mutation';
import deletePositionAttributeCategory from './deletePositionAttributeCategory.mutation';
import editPositionAttributeCategory from './editPositionAttributeCategory.mutation';
import uploadFile from './uploadFile.mutation';
import editUserProfile from './editUserProfile.mutation';
import addApiConfiguration from './addApiConfiguration.mutation';
import editApiConfiguration from './editApiConfiguration.mutation';
import deleteApiConfiguration from './deleteApiConfiguration.mutation';
import addPullJob from './addPullJob.mutation';
import editPullJob from './editPullJob.mutation';
import deletePullJob from './deletePullJob.mutation';
import toggleApplicationLock from './toggleApplicationLock.mutation';
import addUsers from './addUsers.mutation';
import addLayout from './addLayout.mutation';
import deleteLayout from './deleteLayout.mutation';
import editLayout from './editLayout.mutation';
import addReferenceData from './addReferenceData.mutation';
import deleteReferenceData from './deleteReferenceData.mutation';
import editReferenceData from './editReferenceData.mutation';
import duplicatePage from './duplicatePage.mutation';
import addGroup from './addGroup.mutation';
import deleteGroup from './deleteGroup.mutation';
import fetchGroups from './fetchGroups.mutation';
import addAggregation from './addAggregation.mutation';
import editAggregation from './editAggregation.mutation';
import deleteAggregation from './deleteAggregation.mutation';
import addTemplate from './addTemplate.mutation';
import editTemplate from './editTemplate.mutation';
import deleteTemplate from './deleteTemplate.mutation';
import addDistributionList from './addDistributionList.mutation';
import editDistributionList from './editDistributionList.mutation';
import deleteDistributionList from './deleteDistributionList.mutation';
import addCustomNotification from './addCustomNotification.mutation';
import editCustomNotification from './editCustomNotification.mutation';
import deleteCustomNotification from './deleteCustomNotification.mutation';

/** GraphQL mutation definition */
const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    addApiConfiguration,
    addApplication,
    addChannel,
    addDashboard,
    addForm,
    addGroup,
    addLayout,
    addPage,
    addPositionAttribute,
    addPositionAttributeCategory,
    addPullJob,
    addRecord,
    addReferenceData,
    addRole,
    addRoleToUsers,
    addStep,
    addSubscription,
    addTemplate,
    addUsers,
    addWorkflow,
    convertRecord,
    deleteApiConfiguration,
    deleteApplication,
    deleteChannel,
    deleteDashboard,
    deleteForm,
    deleteGroup,
    deleteLayout,
    deletePage,
    deletePositionAttributeCategory,
    deletePullJob,
    deleteRecord,
    deleteRecords,
    deleteReferenceData,
    deleteResource,
    deleteRole,
    deleteStep,
    deleteSubscription,
    deleteTemplate,
    deleteUsers,
    deleteUsersFromApplication,
    deleteWorkflow,
    duplicateApplication,
    duplicatePage,
    editApiConfiguration,
    editApplication,
    editChannel,
    editDashboard,
    editForm,
    editLayout,
    editPage,
    editPositionAttributeCategory,
    editPullJob,
    editRecord,
    editRecords,
    editReferenceData,
    editResource,
    editRole,
    editStep,
    editSubscription,
    editUser,
    editUserProfile,
    editWorkflow,
    fetchGroups,
    editTemplate,
    publish,
    publishNotification,
    restoreRecord,
    seeNotification,
    seeNotifications,
    toggleApplicationLock,
    uploadFile,
    addAggregation,
    editAggregation,
    deleteAggregation,
    addDistributionList,
    deleteDistributionList,
    editDistributionList,
    addCustomNotification,
    editCustomNotification,
    deleteCustomNotification,
  },
});

export default Mutation;
