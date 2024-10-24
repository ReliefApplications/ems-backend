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

jest.mock('config', () => {
  const originalConfig = jest.requireActual('config');
  return {
    ...originalConfig,
    get: jest.fn((setting: string) => {
      if (setting === 'server.protectedShortcuts') {
        return ['is-protected'];
      }
    }),
    util: {
      getEnv: jest.fn((settings: string) => {
        return 'development';
      }),
    },
  };
});

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

  it('should throw an error if shortcut is now allowed by the system', async () => {
    (Application.findOne().select as jest.Mock).mockResolvedValue({
      shortcut: 'is-protected',
    });

    await expect(validateShortcut(mockId, 'is-protected')).rejects.toThrow(
      new GraphQLError('Shortcut is already used by another application.')
    );
    expect(Application.findOne).toHaveBeenCalledWith({
      _id: { $ne: mockId },
      shortcut: 'is-protected',
    });
  });
});
