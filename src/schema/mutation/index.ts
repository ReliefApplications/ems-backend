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

// === MUTATIONS ===
const Mutation = new GraphQLObjectType({
  name: 'Mutation',
  fields: {
    editResource,
    deleteResource,
    addForm,
    editForm,
    deleteForm,
    addRecord,
    editRecord,
    editRecords,
    deleteRecord,
    deleteRecords,
    convertRecord,
    restoreRecord,
    addDashboard,
    editDashboard,
    deleteDashboard,
    addRole,
    editRole,
    deleteRole,
    editUser,
    deleteUsers,
    deleteUsersFromApplication,
    addRoleToUsers,
    addApplication,
    editApplication,
    deleteApplication,
    addPage,
    editPage,
    deletePage,
    addWorkflow,
    editWorkflow,
    deleteWorkflow,
    addStep,
    editStep,
    deleteStep,
    seeNotification,
    seeNotifications,
    publishNotification,
    addChannel,
    editChannel,
    deleteChannel,
    publish,
    addSubscription,
    deleteSubscription,
    editSubscription,
    duplicateApplication,
    addPositionAttributeCategory,
    addPositionAttribute,
    deletePositionAttributeCategory,
    editPositionAttributeCategory,
    uploadFile,
    editUserProfile,
    addApiConfiguration,
    editApiConfiguration,
    deleteApiConfiguration,
    addUsers,
    addPullJob,
    editPullJob,
    deletePullJob,
    toggleApplicationLock,
  },
});

export default Mutation;
