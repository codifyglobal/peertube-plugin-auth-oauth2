jest.mock('../helpers');

const { getRandomBytes } = require('../helpers');

getRandomBytes.mockReturnValue(Promise.resolve('0123456789012345'));

const {
  register,
  unregister,
} = require('../main');

const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

const expectedSettings = [
  {
    name: 'authDisplayName',
    label: 'OAuth2 provider display name',
    type: 'input',
    private: true,
    default: 'OAuth2'
  },
  {
    name: 'clientId',
    label: 'Client ID (required)',
    type: 'input',
    private: true
  },
  {
    name: 'clientSecret',
    label: 'Client secret (required)',
    type: 'input',
    private: true
  },
  {
    name: 'domain',
    label: 'Domain (required) example: auth.example.com',
    type: 'input',
    private: true
  },
  {
    name: 'scope',
    label: 'Scope (required)',
    type: 'input',
    private: true,
    default: 'email openid profile'
  },
  {
    name: 'authorizePath',
    label: 'Authorize URL path (required) example: /oauth2/authorize',
    type: 'input',
    private: true,
    default: ''
  },
  {
    name: 'tokenPath',
    label: 'Token URL path (required) example: /oauth2/token',
    type: 'input',
    private: true,
    default: ''
  },
  {
    name: 'identityPath',
    label: 'Identity URL path (required) example: /oauth2/userInfo',
    type: 'input',
    private: true,
    default: ''
  },
  {
    name: 'identityUsernameField',
    label: 'Identity username field (required)',
    type: 'input',
    private: true,
    default: 'username'
  },
  {
    name: 'identityEmailField',
    label: 'Identity email field (required)',
    type: 'input',
    private: true,
    default: 'email'
  },
  {
    name: 'sendIdentityTokenViaHeader',
    label: 'Send identity token sent via HTTP header? (required for AWS Cognito)',
    type: 'input-checkbox',
    private: true
  },
  {
    name: 'accessTokenParam',
    label: 'Identity access token URL parameter name (required if the identity access token is sent via the URL)',
    type: 'input',
    private: true,
    default: ''
  }
];

it('type validation for register and unregister functions', () => {
  expect(register).toBeInstanceOf(AsyncFunction);
  expect(unregister).toBeInstanceOf(AsyncFunction);
  expect(unregister()).toStrictEqual(new Promise((res) => res({})));
});

it('register function smoke test', async () => {
  // Arrange
  const mockLogger = jest.fn(
    () => {
      return {
        debug: jest.fn(),
        info: jest.fn(),
        log: jest.fn(),
        warning: jest.fn(),
        error: jest.fn(),
      }
    }
  );
  const mockPeertubeHelpers = jest.fn(
    () => {
      return {
        logger: new mockLogger(),
      }
    }
  );
  const mockRouterUseMethod = jest.fn();
  const registerExternalAuth = jest.fn();
  const unregisterExternalAuth = jest.fn();
  const registerSetting = jest.fn();
  const settingsManager = {
    onSettingsChange: jest.fn(),
    getSetting: jest.fn(
      /*eslint no-unused-vars: 0*/
      (settingName) => {
        return new Promise((resolve, reject) => {
          resolve('FooBar');
        });
      }),
    getSettings: jest.fn(),
  };
  const peertubeHelpers = new mockPeertubeHelpers();
  const getRouter = jest.fn(
    () => {
      return {
        use: mockRouterUseMethod,
      }
    }
  );
  // Act
  await register({
    registerExternalAuth,
    unregisterExternalAuth,
    registerSetting,
    settingsManager,
    peertubeHelpers,
    getRouter,
  });
  // Assert
  expect(registerSetting).toHaveBeenCalledTimes(12);
  expectedSettings.forEach((setting, index) => {
    expect(setting).toStrictEqual(
      registerSetting.mock.calls[index][0]
    );
  });
  expect(getRouter).toHaveBeenCalledTimes(1);
  expect(mockRouterUseMethod).toHaveBeenCalledTimes(1);
  expect(mockRouterUseMethod.mock.calls[0][0]).toStrictEqual('/callback');
  expect(mockRouterUseMethod.mock.calls[0][1]).toBeInstanceOf(Function);
  expect(getRandomBytes).toHaveBeenCalledTimes(1);
  expect(getRandomBytes.mock.calls[0][0]).toStrictEqual(16);
  expect(settingsManager.getSetting).toHaveBeenCalledTimes(1);
  expect(settingsManager.getSetting.mock.calls[0][0]).toStrictEqual('authDisplayName');
  expect(settingsManager.onSettingsChange).toHaveBeenCalledTimes(1);
});
