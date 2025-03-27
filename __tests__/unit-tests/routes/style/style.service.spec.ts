import { StyleService } from '@routes/style/style.service';
import sass from 'sass';
import { logger } from '@services/logger.service';
import { Application } from '@models/application.model';
import ApiError from '../../../../src/abstractions/api-error';
import { StatusCodes } from 'http-status-codes';
import { downloadFile } from '@utils/files/downloadFile';
import { v4 as uuidv4 } from 'uuid';

jest.mock('@services/logger.service');
jest.mock('@utils/files/downloadFile');
jest.mock('uuid');

describe('Style Service', () => {
  let service: StyleService;

  const user = {
    _id: '676149c37eb17e606b71c889',
    username: 'mock user',
    attributes: {},
    ability: {
      cannot: jest.fn(),
    },
  };

  beforeAll(() => {
    service = new StyleService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Get application style', () => {
    it('should get application style', async () => {
      jest.spyOn(Application, 'findById').mockResolvedValue({
        id: 'mock-id',
        cssFilename: '/path/to/style.css',
      });
      user.ability.cannot.mockImplementation(() => false);
      (downloadFile as jest.Mock) = jest.fn().mockResolvedValue(null);
      (uuidv4 as jest.Mock).mockReturnValue('mock-uuid');
      const result = await service.getApplicationStyle(user, 'mock-id');
      expect(result).toEqual('files/pathtostyle.css/mock-uuid');
    });

    it('should throw error if application not found', async () => {
      jest.spyOn(Application, 'findById').mockResolvedValue(null);
      await expect(
        service.getApplicationStyle(user, 'mock-id')
      ).rejects.toThrow(ApiError);
      await expect(
        service.getApplicationStyle(user, 'mock-id')
      ).rejects.toMatchObject({
        status: StatusCodes.NOT_FOUND,
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw error if permission not granted', async () => {
      jest.spyOn(Application, 'findById').mockResolvedValue({
        id: 'mock-id',
      });
      user.ability.cannot.mockImplementation(() => true);
      await expect(
        service.getApplicationStyle(user, 'mock-id')
      ).rejects.toThrow(ApiError);
      await expect(
        service.getApplicationStyle(user, 'mock-id')
      ).rejects.toMatchObject({
        status: StatusCodes.FORBIDDEN,
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw error if no style found', async () => {
      jest.spyOn(Application, 'findById').mockResolvedValue({
        id: 'mock-id',
        cssFilename: null,
      });
      user.ability.cannot.mockImplementation(() => false);
      await expect(
        service.getApplicationStyle(user, 'mock-id')
      ).rejects.toThrow(ApiError);
      await expect(
        service.getApplicationStyle(user, 'mock-id')
      ).rejects.toMatchObject({
        status: StatusCodes.NO_CONTENT,
      });
      expect(logger.error).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const error = new Error('Find by id error');
      jest.spyOn(Application, 'findById').mockRejectedValue(error);
      await expect(
        service.getApplicationStyle(user, 'mock-id')
      ).rejects.toThrow(error);
      expect(logger.error).toHaveBeenCalledWith(
        error.message,
        expect.objectContaining({ stack: expect.any(String) })
      );
    });
  });

  describe('Convert SCSS to CSS', () => {
    it('should convert SCSS to CSS', async () => {
      const scss = '$color: red; .test { color: $color; }';
      const expectedCss = '.test {\n  color: red;\n}';
      const css = service.convertScssToCss(scss);
      expect(css).toEqual(expectedCss);
    });

    it('should handle errors', async () => {
      const scss = '$color: red; .test { color: $color; }';
      const error = new Error('compile error');
      jest.spyOn(sass, 'compileString').mockImplementation(() => {
        throw error;
      });

      expect(() => service.convertScssToCss(scss)).toThrowError(error);
      expect(logger.error).toHaveBeenCalledWith(
        error.message,
        expect.objectContaining({ stack: expect.any(String) })
      );
    });
  });
});
