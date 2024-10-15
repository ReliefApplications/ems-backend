import { GraphQLError } from 'graphql';
import { Application } from '@models/application.model';
import { validateShortcut } from '@schema/mutation/editApplication.mutation';

jest.mock('@models/application.model', () => ({
  Application: {
    findOne: jest.fn().mockReturnValue({
      select: jest.fn(),
    }),
  },
}));

describe('validateShortcut', () => {
  const mockId = 'mockId';
  const mockShortcut = 'mockShortcut';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should pass validation if shortcut is not used by another application', async () => {
    (Application.findOne().select as jest.Mock).mockResolvedValue(null);

    await expect(validateShortcut(mockId, mockShortcut)).resolves.not.toThrow();
    expect(Application.findOne).toHaveBeenCalledWith({
      _id: { $ne: mockId },
      shortcut: mockShortcut,
    });
  });

  it('should throw an error if shortcut is used by another application', async () => {
    (Application.findOne().select as jest.Mock).mockResolvedValue({
      shortcut: mockShortcut,
    });

    await expect(validateShortcut(mockId, mockShortcut)).rejects.toThrow(
      new GraphQLError('Shortcut is already used by another application.')
    );
    expect(Application.findOne).toHaveBeenCalledWith({
      _id: { $ne: mockId },
      shortcut: mockShortcut,
    });
  });
});
