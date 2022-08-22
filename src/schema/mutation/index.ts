import { GraphQLObjectType } from 'graphql';
import deleteResource from './deleteResource';
import addForm from './addForm';
import editForm from './editForm';
import editResource from './editResource';
import deleteForm from './deleteForm';
import addRecord from './addRecord';
import editRecord from './editRecord';
import editRecords from './editRecords';
import deleteRecord from './deleteRecord';
import deleteRecords from './deleteRecords';
import convertRecord from './convertRecord';
import restoreRecord from './restoreRecord';
import addDashboard from './addDashboard';
import editDashboard from './editDashboard';
import deleteDashboard from './deleteDashboard';
import addRole from './addRole';
import editRole from './editRole';
import deleteRole from './deleteRole';
import editUser from './editUser';
import deleteUsers from './deleteUsers';
import deleteUsersFromApplication from './deleteUsersFromApplication';
import addRoleToUsers from './addRoleToUsers';
import addApplication from './addApplication';
import editApplication from './editApplication';
import deleteApplication from './deleteApplication';
import addPage from './addPage';
import editPage from './editPage';
import deletePage from './deletePage';
import addWorkflow from './addWorkflow';
import editWorkflow from './editWorkflow';
import deleteWorkflow from './deleteWorkflow';
import addStep from './addStep';
import editStep from './editStep';
import deleteStep from './deleteStep';
import seeNotification from './seeNotification';
import seeNotifications from './seeNotifications';
import publishNotification from './publishNotification';
import addChannel from './addChannel';
import editChannel from './editChannel';
import deleteChannel from './deleteChannel';
import publish from './publish';
import addSubscription from './addSubscription';
import deleteSubscription from './deleteSubscription';
import editSubscription from './editSubscription';
import duplicateApplication from './duplicateApplication';
import addPositionAttributeCategory from './addPositionAttributeCategory';
import addPositionAttribute from './addPositionAttribute';
import deletePositionAttributeCategory from './deletePositionAttributeCategory';
import editPositionAttributeCategory from './editPositionAttributeCategory';
import uploadFile from './uploadFile';
import editUserProfile from './editUserProfile';
import addApiConfiguration from './addApiConfiguration';
import editApiConfiguration from './editApiConfiguration';
import deleteApiConfiguration from './deleteApiConfiguration';
import addPullJob from './addPullJob';
import editPullJob from './editPullJob';
import deletePullJob from './deletePullJob';
import toggleApplicationLock from './toggleApplicationLock';
import addUsers from './addUsers';
import addLayout from './addLayout';
import deleteLayout from './deleteLayout';
import editLayout from './editLayout';
import addReferenceData from './addReferenceData';
import deleteReferenceData from './deleteReferenceData';
import editReferenceData from './editReferenceData';
import duplicatePage from './duplicatePage';
import editSetting from './editSetting';
import addGroup from './addGroup';
import deleteGroup from './deleteGroup';
import fetchGroups from './fetchGroups';

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
    publish,
    publishNotification,
    restoreRecord,
    seeNotification,
    seeNotifications,
    toggleApplicationLock,
    editSetting,
    uploadFile,
  },
});

export default Mutation;
