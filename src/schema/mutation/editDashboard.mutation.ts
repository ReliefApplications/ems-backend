import {
  GraphQLNonNull,
  GraphQLID,
  GraphQLString,
  GraphQLError,
  GraphQLBoolean,
} from 'graphql';
import GraphQLJSON from 'graphql-type-json';
import { DashboardType } from '../types';
import { Dashboard, Page, Step } from '@models';
import extendAbilityForContent from '@security/extendAbilityForContent';
import { isEmpty, isNil } from 'lodash';
import { logger } from '@services/logger.service';
import { graphQLAuthCheck } from '@schema/shared';
import { Types } from 'mongoose';
import { Context } from '@server/apollo/context';
import { DashboardFilterInputType } from '@schema/inputs/dashboard-filter.input';
import axios from 'axios';

type DashboardButtonArgs = {
  text: string;
  href: string;
  variant: string;
  category: string;
  openInNewTab: boolean;
};

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
  showFilter?: boolean;
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
      console.log('Error fetching image:', error);
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
    showFilter: { type: GraphQLBoolean },
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
        showFilter?: boolean;
      } = {};

      // Update URL to base64 file
      for (const [index, struct] of args.structure.entries()) {
        if (struct && struct.settings && struct.settings.text) {
          args.structure[index].settings.text = await convertUrlToBase64(
            struct.settings.text
          );
        }
      }

      Object.assign(
        updateDashboard,
        args.structure && { structure: args.structure },
        args.name && { name: args.name },
        !isNil(args.showFilter) && { showFilter: args.showFilter }
      );
      dashboard = await Dashboard.findByIdAndUpdate(args.id, updateDashboard, {
        new: true,
      });
      // update the related page or step
      const update = {
        modifiedAt: dashboard.modifiedAt,
        name: dashboard.name,
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
