import permissions from '@const/permissions';
import { Application, Page, Step, User, Workflow } from '@models';
import defineUserAbility from '@security/defineUserAbility';
import extendAbilityForStep from '@security/extendAbilityForStep';
import { Types } from 'mongoose';
import { DatabaseHelpers } from '../../helpers/database-helpers';

/**
 * Build a user stub with a single role and its base ability.
 *
 * @param roleId Id of the user role
 * @param perms Global permission types of the role
 * @returns user stub
 */
const buildUser = (roleId: Types.ObjectId, perms: string[] = []): User => {
  const user = {
    _id: new Types.ObjectId(),
    roles: [
      {
        _id: roleId,
        permissions: perms.map((type) => ({ type, global: true })),
      },
    ],
  } as unknown as User;
  user.ability = defineUserAbility(user);
  return user;
};

/**
 * Create a step wired to an application through a workflow and a page.
 *
 * @param name Base name of the created documents
 * @param permissions The application permissions
 * @returns created documents
 */
const createStepInApplication = async (
  name: string,
  permissions: any
): Promise<{ step: Step; workflow: Workflow; application: Application }> => {
  const step = await Step.create({ name: `Step - ${name}` });
  const workflow = await Workflow.create({
    name: `Workflow - ${name}`,
    steps: [step._id],
  });
  const page = await Page.create({
    name: `Page - ${name}`,
    type: 'workflow',
    content: workflow._id,
  });
  const application = await Application.create({
    name: `App - ${name}`,
    pages: [page._id],
    permissions,
  });
  return { step, workflow, application };
};

let databaseHelpers: DatabaseHelpers;

describe('extendAbilityForStep', () => {
  beforeAll(async () => {
    databaseHelpers = new DatabaseHelpers();
    await databaseHelpers.connect();
  });

  afterAll(async () => {
    await databaseHelpers.disconnect();
  });

  describe('on a step', () => {
    it('should give read access when a role can see the application', async () => {
      const roleId = new Types.ObjectId();
      const user = buildUser(roleId);
      const { step } = await createStepInApplication('see', {
        canSee: [roleId],
      });
      const otherStep = await Step.create({ name: 'Step - see (other)' });

      const ability = await extendAbilityForStep(user, step);

      expect(ability.can('read', step)).toBe(true);
      expect(ability.can('update', step)).toBe(false);
      expect(ability.can('delete', step)).toBe(false);
      expect(ability.can('read', otherStep)).toBe(false);
    });

    it('should give write and delete access when a role can update the application', async () => {
      const roleId = new Types.ObjectId();
      const user = buildUser(roleId);
      const { step } = await createStepInApplication('update', {
        canUpdate: [roleId],
      });

      const ability = await extendAbilityForStep(user, step);

      expect(ability.can('update', step)).toBe(true);
      expect(ability.can('delete', step)).toBe(true);
      expect(ability.can('read', step)).toBe(false);
    });

    it('should not extend anything when the user roles are not on the application', async () => {
      const user = buildUser(new Types.ObjectId());
      const { step } = await createStepInApplication('none', {
        canSee: [new Types.ObjectId()],
        canUpdate: [new Types.ObjectId()],
      });

      const ability = await extendAbilityForStep(user, step);

      expect(ability.can('read', step)).toBe(false);
      expect(ability.can('update', step)).toBe(false);
      expect(ability.can('delete', step)).toBe(false);
    });

    it('should keep access given by the step own permissions', async () => {
      const roleId = new Types.ObjectId();
      const user = buildUser(roleId);
      const step = await Step.create({
        name: 'Step - own permission',
        permissions: { canSee: [roleId] },
      });

      const ability = await extendAbilityForStep(user, step);

      expect(ability.can('read', step)).toBe(true);
    });
  });

  describe('on a workflow', () => {
    it('should extend the ability for every step of the workflow', async () => {
      const roleId = new Types.ObjectId();
      const user = buildUser(roleId);
      const stepA = await Step.create({ name: 'Step A - workflow' });
      const stepB = await Step.create({ name: 'Step B - workflow' });
      const workflow = await Workflow.create({
        name: 'Workflow - all steps',
        steps: [stepA._id, stepB._id],
      });
      const page = await Page.create({
        name: 'Page - all steps',
        type: 'workflow',
        content: workflow._id,
      });
      await Application.create({
        name: 'App - all steps',
        pages: [page._id],
        permissions: { canSee: [roleId] },
      });

      const ability = await extendAbilityForStep(user, workflow);

      expect(ability.can('read', stepA)).toBe(true);
      expect(ability.can('read', stepB)).toBe(true);
      expect(ability.can('create', 'Step')).toBe(false);
    });

    it('should give step creation to users who can update the workflow', async () => {
      const roleId = new Types.ObjectId();
      const user = buildUser(roleId, [permissions.canManageApplications]);
      const workflow = await Workflow.create({ name: 'Workflow - creation' });

      const ability = await extendAbilityForStep(user, workflow);

      expect(ability.can('create', 'Step')).toBe(true);
    });
  });

  it('should throw for an unexpected object type', async () => {
    const user = buildUser(new Types.ObjectId());

    await expect(
      extendAbilityForStep(user, { name: 'not a model' } as any)
    ).rejects.toThrow('Unexpected type');
  });
});
