import errors from '../const/errors';
import { GraphQLError } from 'graphql';
import { Page, Application, Workflow, Dashboard, Form, Step } from '../models';

/**
 * Creates new pages from a given application and returns them in an array.
 *
 * @param application application to duplicate pages of.
 * @returns new pages, copied from the application.
 */
async function duplicatePages(application: Application) {
  const copiedPages = [];
  await Promise.all(
    application.pages.map(async (pageId) => {
      await Page.findById(pageId).then(async (p) => {
        if (p) {
          const page = new Page({
            name: p.name,
            createdAt: new Date(),
            type: p.type,
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            content: await duplicateContent(p.content, p.type),
            permissions: p.permissions,
          });
          const id = await page.save().then((saved) => {
            copiedPages.push(saved.id);
            return saved.id;
          });
          return id;
        }
        return p;
      });
      return pageId;
    })
  );
  return copiedPages;
}

export default duplicatePages;

/**
 * Duplicates the content of a page, based on the contentID and type.
 *
 * @param contentId id of content to duplicate ( page )
 * @param pageType type of the page
 * @returns duplicated content.
 */
async function duplicateContent(contentId, pageType) {
  let content: any;
  switch (pageType) {
    case 'workflow': {
      const w = await Workflow.findById(contentId);
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      const steps = await duplicateSteps(w.steps);
      const workflow = new Workflow({
        name: w.name,
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
        name: d.name,
        createdAt: new Date(),
        structure: d.structure,
      });
      await dashboard.save();
      content = dashboard._id;
      break;
    }
    case 'form': {
      const form = await Form.findById(contentId);
      if (!form) {
        throw new GraphQLError(errors.dataNotFound);
      }
      content = form._id;
      break;
    }
    default:
      break;
  }
  return content;
}

/**
 * Duplicates the step from a workflow. Will call duplicateContent for Step content.
 *
 * @param ids ids of the steps.
 * @returns copy of the steps.
 */
async function duplicateSteps(ids): Promise<any[]> {
  const copiedSteps = [];
  await Promise.all(
    ids.map(async (id) => {
      await Step.findById(id).then(async (s) => {
        if (s.type !== 'workflow') {
          //A step type should never be workflow, but if some error occurs, this condition will prevent recursion
          const step = new Step({
            name: s.name,
            createdAt: new Date(),
            type: s.type,
            content: await duplicateContent(s.content, s.type),
            permissions: s.permissions,
          });
          const newId = await step.save().then((saved) => {
            copiedSteps.push(saved.id);
            return saved.id;
          });
          return newId;
        }
        return s;
      });
      return id;
    })
  );
  return copiedSteps;
}
