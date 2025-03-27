import { StyleService } from '@routes/style/style.service';
import sass from 'sass';
import { logger } from '@services/logger.service';

jest.mock('@services/logger.service');
// jest.mock('sass', () => ({
//   compileString: jest.fn(),
// }));

describe('Style Service', () => {
  let service: StyleService;

  beforeAll(() => {
    service = new StyleService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
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
