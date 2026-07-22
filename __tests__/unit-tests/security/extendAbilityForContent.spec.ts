import {
  Application,
  Dashboard,
  Form,
  Page,
  Step,
  User,
  Workflow,
} from '@models';
import defineUserAbility from '@security/defineUserAbility';
import extendAbilityForContent from '@security/extendAbilityForContent';
import { Types } from 'mongoose';
import { DatabaseHelpers } from '../../helpers/database-helpers';

/**
 * Build a user stub with a single role and its base ability.
 *
 * @param roleId Id of the user role
 * @returns user stub
 */
const buildUser = (roleId: Types.ObjectId): User => {
  const user = {
    _id: new Types.ObjectId(),
    roles: [{ _id: roleId, permissions: [] }],
  } as unknown as User;
  user.ability = defineUserAbility(user);
  return user;
};

let databaseHelpers: DatabaseHelpers;

describe('extendAbilityForContent', () => {
  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  it('should give read access to a dashboard through its page', async () => {
    const roleId = new Types.ObjectId();
    const user = buildUser(roleId);
    const dashboard = await Dashboard.create({ name: 'Dashboard - see' });
    const page = await Page.create({
      name: 'Page - dashboard see',
      type: 'dashboard',
      content: dashboard._id,
    });
    await Application.create({
      name: 'App - dashboard see',
      pages: [page._id],
      permissions: { canSee: [roleId] },
    });

    const ability = await extendAbilityForContent(user, dashboard);

    expect(ability.can('read', dashboard)).toBe(true);
    expect(ability.can('update', dashboard)).toBe(false);
    expect(ability.can('delete', dashboard)).toBe(false);
  });

  it('should give write access to a dashboard through its page', async () => {
    const roleId = new Types.ObjectId();
    const user = buildUser(roleId);
    const dashboard = await Dashboard.create({ name: 'Dashboard - update' });
    const page = await Page.create({
      name: 'Page - dashboard update',
      type: 'dashboard',
      content: dashboard._id,
    });
    await Application.create({
      name: 'App - dashboard update',
      pages: [page._id],
      permissions: { canUpdate: [roleId] },
    });

    const ability = await extendAbilityForContent(user, dashboard);

    expect(ability.can('update', dashboard)).toBe(true);
    expect(ability.can('delete', dashboard)).toBe(true);
    expect(ability.can('read', dashboard)).toBe(false);
  });

  it('should give access to a workflow through its step', async () => {
    const roleId = new Types.ObjectId();
    const user = buildUser(roleId);
    const workflow = await Workflow.create({ name: 'Workflow - content' });
    const step = await Step.create({
      name: 'Step - workflow content',
      type: 'workflow',
      content: workflow._id,
    });
    const containerWorkflow = await Workflow.create({
      name: 'Workflow - container',
      steps: [step._id],
    });
    const page = await Page.create({
      name: 'Page - workflow content',
      type: 'workflow',
      content: containerWorkflow._id,
    });
    await Application.create({
      name: 'App - workflow content',
      pages: [page._id],
      permissions: { canSee: [roleId] },
    });

    const ability = await extendAbilityForContent(user, workflow);

    expect(ability.can('read', workflow)).toBe(true);
    expect(ability.can('update', workflow)).toBe(false);
  });

  it('should give access to a form used as content of a given container', async () => {
    const roleId = new Types.ObjectId();
    const user = buildUser(roleId);
    const form = await Form.create({
      name: 'Form - content',
      graphQLTypeName: 'FormContent',
    });
    const page = await Page.create({
      name: 'Page - form content',
      type: 'form',
      content: form._id,
    });
    const application = await Application.create({
      name: 'App - form content',
      pages: [page._id],
      permissions: { canSee: [roleId] },
    });

    const ability = await extendAbilityForContent(
      user,
      form,
      page,
      application
    );

    expect(ability.can('read', form)).toBe(true);
    expect(ability.can('update', form)).toBe(false);
  });

  it('should return the ability unchanged when the content is not used anywhere', async () => {
    const user = buildUser(new Types.ObjectId());
    const form = await Form.create({
      name: 'Form - orphan',
      graphQLTypeName: 'FormOrphan',
    });

    const ability = await extendAbilityForContent(user, form);

    expect(ability).toBe(user.ability);
    expect(ability.can('read', form)).toBe(false);
  });

  it('should not extend anything when the user cannot access the container', async () => {
    const user = buildUser(new Types.ObjectId());
    const dashboard = await Dashboard.create({ name: 'Dashboard - none' });
    const page = await Page.create({
      name: 'Page - dashboard none',
      type: 'dashboard',
      content: dashboard._id,
    });
    await Application.create({
      name: 'App - dashboard none',
      pages: [page._id],
      permissions: { canSee: [new Types.ObjectId()] },
    });

    const ability = await extendAbilityForContent(user, dashboard);

    expect(ability.can('read', dashboard)).toBe(false);
    expect(ability.can('update', dashboard)).toBe(false);
  });
});
