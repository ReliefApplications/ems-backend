import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLError,
  GraphQLList,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { DashboardType } from '../types';
import { Button, Dashboard, Page, Step } from '@models';
import extendAbilityForContent from '@security/extendAbilityForContent';
import { isEmpty } from 'lodash';
import { logger } from '@services/logger.service';
import ActionButtonInputType from '@schema/inputs/button-action.input';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { DashboardFilterInputType } from '@schema/inputs/dashboard-filter.input';
import axios from 'axios';

type DashboardFilterArgs = {
  variant?: string;
  show?: boolean;
  closable?: boolean;
  structure?: any;
  position?: string;
};

/** Arguments for the editDashboard mutation */
type EditDashboardArgs = {
  id: string | Types.ObjectId;
  structure?: any;
  name?: string;
  buttons?: Button[];
  gridOptions?: any;
  filter?: DashboardFilterArgs;
};

/**
 * Convert the URL to base64 file
 *
 * @param text Argument for find the URL & base64
 * @returns Base64 string as promise
 */
async function convertUrlToBase64(text: any): Promise<any> {
  // Regex for Separate the url and base64 images
  const imageUrlRegex = /<img src="([^"]+)"[^>]*>/g;
  // Find the urls using Regex
  const urls = Array.from(
    text.matchAll(imageUrlRegex),
    (match: any) => match[1]
  );
  // Verify and change the image format
  for (const url of urls) {
    if (url.startsWith('data:image')) {
      continue; // Skip if already a data URL
    }

    try {
      // Fetch the image data
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      if (response && response.data) {
        // Read the response body as buffer
        const base64String = Buffer.from(response.data, 'binary').toString(
          'base64'
        );
        // Create the data URI
        const mimeType = response.headers['content-type'];
        const dataURI = `data:${mimeType};base64,${base64String}`;
        text = text.replace(url, dataURI);
      }
    } catch (error) {
      logger.error('Error fetching image:', error);
    }
  }
  return text;
}

/**
 * Find dashboard from its id and update it, if user is authorized.
 * Throw an error if not logged or authorized, or arguments are invalid.
 */
export default {
  type: DashboardType,
  args: {
    id: { type: new GraphQLNonNull(GraphQLID) },
    structure: { type: GraphQLJSON },
    name: { type: GraphQLString },
    buttons: { type: new GraphQLList(ActionButtonInputType) },
    gridOptions: { type: GraphQLJSON },
    filter: { type: DashboardFilterInputType },
  },
  async resolve(parent, args: EditDashboardArgs, context: Context) {
    graphQLAuthCheck(context);
    try {
      const user = context.user;
      // check inputs
      if (!args || isEmpty(args)) {
        throw new GraphQLError(
          context.i18next.t('mutations.dashboard.edit.errors.invalidArguments')
        );
      }
      // get data
      let dashboard = await Dashboard.findById(args.id);
      // check permissions
      const ability = await extendAbilityForContent(user, dashboard);
      if (ability.cannot('update', dashboard)) {
        throw new GraphQLError(
          context.i18next.t('common.errors.permissionNotGranted')
        );
      }
      // do the update on dashboard
      const updateDashboard: {
        //modifiedAt?: Date;
        structure?: any;
        name?: string;
        filter?: any;
        buttons?: any;
        gridOptions?: any;
      } = {};

      if (args.structure) {
        /**
         * Update URL to base64 file
         * Important for dashboard export, as urls cannot be correctly converted otherwise to images.
         */
        for (const [index, widget] of args.structure.entries()) {
          if (widget && widget.settings && widget.settings.text) {
            args.structure[index].settings.text = await convertUrlToBase64(
              widget.settings.text
            );
          }
        }
      }

      Object.assign(
        updateDashboard,
        args.structure && { structure: args.structure },
        args.name && { name: args.name },
        args.filter && {
          filter: { ...dashboard.toObject().filter, ...args.filter },
        },
        args.buttons && { buttons: args.buttons },
        args.gridOptions && { gridOptions: args.gridOptions }
      );
      dashboard = await Dashboard.findByIdAndUpdate(args.id, updateDashboard, {
        new: true,
      });
      // update the related page or step
      const update = {
        modifiedAt: dashboard.modifiedAt, //todo: remove?
        name: dashboard.name,
        gridOptions: dashboard.gridOptions,
      };
      await Page.findOneAndUpdate({ content: dashboard.id }, update);
      await Step.findOneAndUpdate({ content: dashboard.id }, update);
      return dashboard;
    } catch (err) {
      logger.error(err.message, { stack: err.stack });
      if (err instanceof GraphQLError) {
        throw new GraphQLError(err.message);
      }
      throw new GraphQLError(
        context.i18next.t('common.errors.internalServerError')
      );
    }
  },
};
