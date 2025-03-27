import StyleController from '@routes/style/style.controller';
import { NextFunction, Request, Response } from 'express';
import { RouteDefinition } from '../../../../src/types/route-definition';
import { StyleService } from '@routes/style/style.service';
import fs from 'fs';

describe('Style Controller', () => {
  let request: Partial<Request>;
  let response: Partial<Response>;
  const next: NextFunction = jest.fn();
  let controller: StyleController;

  const user = {
    _id: '676149c37eb17e606b71c889',
    username: 'mock user',
    attributes: {},
  };

  beforeAll(async () => {
    controller = new StyleController();
  });

  beforeEach(() => {
    request = {} as Partial<Request>;
    response = {
      locals: {},
      status: jest.fn(),
      send: jest.fn(),
      download: jest.fn(),
    } as Partial<Response>;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should define routes and return array of route definition', () => {
    const routes: RouteDefinition[] = controller.routes();
    expect(routes).toBeDefined();
    expect(routes.length).toBeGreaterThan(0);
  });

  describe('Get application style', () => {
    it('should get application style', async () => {
      request.params = { id: '676149c37eb17e606b71c889' };
      request.context = { user };
      const getApplicationStyle = jest.spyOn(
        StyleService.prototype,
        'getApplicationStyle'
      );
      getApplicationStyle.mockResolvedValue('path/to/style.css');
      const download = jest.spyOn(response, 'download');
      download.mockImplementation(() =>
        fs.unlink('path/to/style.css', () => {})
      );
      const unlink = jest.spyOn(fs, 'unlink');
      await controller.getApplicationStyle(
        request as Request,
        response as Response,
        next
      );
      expect(download).toHaveBeenCalledWith(
        'path/to/style.css',
        expect.any(Function)
      );
      expect(unlink).toHaveBeenCalledWith(
        'path/to/style.css',
        expect.any(Function)
      );
    });

    it('should handle errors', async () => {
      request.params = { id: '676149c37eb17e606b71c889' };
      request.context = { user };
      const error = new Error('error');
      const getApplicationStyle = jest.spyOn(
        StyleService.prototype,
        'getApplicationStyle'
      );
      getApplicationStyle.mockImplementation(() => {
        throw error;
      });
      await controller.getApplicationStyle(
        request as Request,
        response as Response,
        next
      );
      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('Convert SCSS to CSS', () => {
    it('should convert SCSS to CSS', async () => {
      request.body = {
        scss: '$color: red; .test { color: $color; }',
      };
      request.context = { user };
      const convertScssToCss = jest.spyOn(
        StyleService.prototype,
        'convertScssToCss'
      );
      convertScssToCss.mockReturnValue('.test { color: red; }');
      const send = jest.spyOn(controller, 'send');
      await controller.convertScssToCss(
        request as Request,
        response as Response,
        next
      );
      expect(response.status).toHaveBeenCalledWith(200);
      const locals = response.locals;
      expect(locals?.data).toEqual('.test { color: red; }');
      expect(send).toHaveBeenCalledWith(response as Response);
    });

    it('should handle errors', async () => {
      request.body = {
        scss: '$color: red; .test { color: $color; }',
      };
      request.context = { user };
      const error = new Error('scss error');
      const convertScssToCss = jest.spyOn(
        StyleService.prototype,
        'convertScssToCss'
      );
      convertScssToCss.mockImplementation(() => {
        throw error;
      });
      await controller.convertScssToCss(
        request as Request,
        response as Response,
        next
      );
      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
