import { GraphQLError } from 'graphql';
import { Page, Application, Workflow, Dashboard, Form, Step } from '@models';
import i18next from 'i18next';

/**
 * Connects the duplicate application role id with the new one
 *
 * @param permissions permissions to check
 * @param newPermissions new permissions to apply
 * @returns array of permissions
 */
const getPermissions = (
  permissions: any,
  newPermissions: { [key: string]: string }
): string[] => {
  const result: string[] = [];
  for (let i = 0; i < permissions.length; i++) {
    const key = permissions[i].toString();
    if (key in newPermissions) {
      result.push(newPermissions[key]);
    }
  }
  return result;
};

/**
 * Creates new pages from a given application and returns them in an array.
 *
 * @param application application to duplicate pages of.
 * @param newPermissions new permissions to apply
 * @returns new pages, copied from the application.
 */
export const duplicatePages = async (
  application: Application,
  newPermissions: Record<string, string>
) => {
  const copiedPages = [];
  for (const pageId of application.pages) {
    const p = await Page.findById(pageId);
    const contentWithContextCopy = await Promise.all(
      p.contentWithContext.map(async (c) => ({
        ...c,
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        content: await duplicateContent(
          c.content,
          p.type,
          undefined,
          undefined,
          newPermissions
        ),
      }))
    );

    const page = new Page({
      name: p.name,
      type: p.type,
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      content: await duplicateContent(
        p.content,
        p.type,
        undefined,
        undefined,
        newPermissions
      ),
      context: p.context,
      contentWithContext: contentWithContextCopy,
      permissions: {
        canSee: getPermissions(p.permissions.canSee, newPermissions),
        canUpdate: getPermissions(p.permissions.canUpdate, newPermissions),
        canDelete: getPermissions(p.permissions.canDelete, newPermissions),
      },
      visible: p.visible,
      icon: p.icon,
      archived: p.archived,
      archivedAt: p.archivedAt,
    });
    const saved = await page.save();
    copiedPages.push(saved.id);
  }
  return copiedPages;
};

/**
 * Copy Page.
 *
 * @param page Page to copy
 * @param name new name to apply
 * @param permissions new permissions to apply
 * @returns copy of the page
 */
export const duplicatePage = async (
  page: Page,
  name?: string,
  permissions?: any
) => {
  const newPage = new Page({
    name: name || page.name,
    createdAt: new Date(),
    type: page.type,
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    content: await duplicateContent(page.content, page.type, name, permissions),
    ...(permissions && { permissions: permissions }),
  });
  await newPage.save();
  return newPage;
};

/**
 * Duplicates the content of a page, based on the contentID and type.
 *
 * @param contentId id of content to duplicate ( page )
 * @param pageType type of the page
 * @param name new name to apply
 * @param permissions new permissions to apply
 * @returns duplicated content.
 */
const duplicateContent = async (
  contentId,
  pageType,
  name?: string,
  permissions?: any,
  newPermissions?: { [key: string]: string }
) => {
  let content: any;
  switch (pageType) {
    case 'workflow': {
      const w = await Workflow.findById(contentId);
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      const steps = await duplicateSteps(w.steps, permissions, newPermissions);
      const workflow = new Workflow({
        name: name || w.name,
        createdAt: new Date(),
        steps,
      });
      await workflow.save();
      content = workflow._id;
      break;
    }
    case 'dashboard': {
      const d = await Dashboard.findById(contentId);
      const dashboard = new Dashboard({
        name: name || d.name,
        createdAt: new Date(),
        structure: d.structure,
        buttons: d.buttons,
        gridOptions: d.gridOptions,
        filter: d.filter,
      });
      await dashboard.save();
      content = dashboard._id;
      break;
    }
    case 'form': {
      const form = await Form.findById(contentId);
      if (!form) {
        throw new GraphQLError(i18next.t('errors.dataNotFound'));
      }
      content = form._id;
      break;
    }
    default:
      break;
  }
  return content;
};

/**
 * Duplicates the step from a workflow. Will call duplicateContent for Step content.
 *
 * @param ids ids of the steps.
 * @param permissions new permissions to apply
 * @returns copy of the steps.
 */
const duplicateSteps = async (
  ids,
  permissions?: any,
  newPermissions?: { [key: string]: string }
): Promise<any[]> => {
  const copiedSteps = [];
  for (const id of ids) {
    const s = await Step.findById(id);
    if (s.type !== 'workflow') {
      //A step type should never be workflow, but if some error occurs, this condition will prevent recursion
      const step = new Step({
        name: s.name,
        createdAt: new Date(),
        type: s.type,
        content: await duplicateContent(s.content, s.type, null, permissions),
        permissions: permissions || {
          canSee: getPermissions(s.permissions.canSee, newPermissions),
          canUpdate: getPermissions(s.permissions.canUpdate, newPermissions),
          canDelete: getPermissions(s.permissions.canDelete, newPermissions),
        },
        icon: s.icon,
      });
      const saved = await step.save();
      copiedSteps.push(saved.id);
    }
  }
  return copiedSteps;
};
