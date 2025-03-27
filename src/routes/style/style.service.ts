import { Application } from '@models/application.model';
import { AppAbility } from '@security/defineUserAbility';
import { logger } from '@services/logger.service';
import ApiError from '../../abstractions/api-error';
import { compileString } from 'sass';
import { v4 as uuidv4 } from 'uuid';
import i18next from 'i18next';
import { StatusCodes } from 'http-status-codes';
import sanitize from 'sanitize-filename';
import { downloadFile } from '@utils/files/downloadFile';

/**
 * Style service
 */
export class StyleService {
  /**
   * Get application custom scss
   * Store the custom scss in a temporary folder
   *
   * @param user Current user
   * @param applicationId Application id
   * @returns path to application custom css
   */
  public async getApplicationStyle(
    user,
    applicationId: string
  ): Promise<string> {
    try {
      const ability: AppAbility = user.ability;
      const application: Application = await Application.findById(
        applicationId
      );
      // Cannot find application
      if (!application) {
        throw new ApiError(
          i18next.t('common.errors.dataNotFound'),
          StatusCodes.NOT_FOUND
        );
      }
      // Check permission
      if (ability.cannot('read', application)) {
        throw new ApiError(
          i18next.t('common.errors.permissionNotGranted'),
          StatusCodes.FORBIDDEN
        );
      }
      // Check if application has custom style
      if (application.cssFilename) {
        const blobName = application.cssFilename;
        const path = `files/${sanitize(blobName)}/${uuidv4()}`;
        await downloadFile('applications', blobName, path);
        return path;
      } else {
        throw new ApiError(
          i18next.t('routes.style.noStyle'),
          StatusCodes.NO_CONTENT
        );
      }
    } catch (error) {
      logger.error(error.message, { stack: error.stack });
      throw error;
    }
  }

  /**
   * Convert scss content to css
   *
   * @param scss scss content
   * @returns css content
   */
  public convertScssToCss(scss: string) {
    try {
      return compileString(scss).css;
    } catch (error) {
      logger.error(error.message, { stack: error.stack });
      throw error;
    }
  }
}
