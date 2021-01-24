const ClientOAuth2 = require('client-oauth2');
const popsicle = require('popsicle');

const {
  getRandomBytes
} = require('./helpers');

const store = {
  client: null,
  domain: null,
  scope: null,
  userAuthenticated: null,
  stateKey: null,
  redirectUrl: null,
  authDisplayName: 'OAuth2',
  identityPath: null,
  identityUsernameField: null,
  sendIdentityTokenViaHeader: null,
  accessTokenParam: null,
};

function redirectOnError(res) {
  res.redirect('/login?externalAuthError=true');
}

async function handleCallback(peertubeHelpers, settingsManager, req, res) {
  const { logger } = peertubeHelpers;

  if (!store.userAuthenticated) {
    logger.error(
      'Received callback but cannot userAuthenticated function does not exist.'
    );
    return redirectOnError(res);
  }
  if (!req.query.code) {
    logger.error(
      'req.query.code not set.'
    );
    return redirectOnError(res);
  }
  if (!req.query.state) {
    logger.error(
      'req.query.state not set.'
    );
    return redirectOnError(res);
  }
  if (!store.stateKey) {
    logger.error(
      'store.stateKey is required.'
    );
    return redirectOnError(res);
  }
  if (req.query.state !== store.stateKey) {
    logger.error(
      'state parameters do not match.'
    );
    return redirectOnError(res);
  }
  if (!store.redirectUrl) {
    logger.error(
      'store.redirectUrl is required.'
    );
    return redirectOnError(res);
  }

  try {
    store.client.code.getToken(
      req.originalUrl,
      {
        redirectUri: store.redirectUrl,
        scopes: store.scope.split(/\s+/),
        state: store.stateKey
      }
    ).then(
      (userToken) => {
        let headers = null;
        const accessToken = userToken.accessToken;
        const urlEncodedToken = encodeURIComponent(accessToken);
        const urlEncodedAccessTokenParam = encodeURIComponent(store.accessTokenParam);
        const urlBase = `https://${store.domain}${store.identityPath}`;
        let url = `${urlBase}?${urlEncodedAccessTokenParam}=${urlEncodedToken}`;
        if (store.sendIdentityTokenViaHeader) {
          url = urlBase;
          headers = new popsicle.Headers(
            { Authorization: `Bearer ${accessToken}` }
          );
        }
        popsicle.fetch(
          url,
          ( headers &&
            { headers }
          )
        ).then(
          async (identityResponse) => {
            const identityData = await identityResponse.json();
            const username = identityData[store.identityUsernameField];
            const email = `${username}@${store.domain}`;
            const role = 2; // Admin = 0, Moderator = 1, User = 2
            return store.userAuthenticated({
              res,
              req,
              username,
              email,
              displayName: username,
              role,
            });
          }
        ).catch(
          (err) => {
            logger.error('Identity request failed.', { err });
            return redirectOnError(res);
          }
        );
      }
    ).catch((err) => {
      logger.error('Access token error.', { err });
      return redirectOnError(res);
    });
  } catch (err) {
    logger.error('Error in handle callback.', { err });
    return redirectOnError(res);
  }
}

async function loadSettingsAndCreateClient(
  registerExternalAuth,
  unregisterExternalAuth,
  peertubeHelpers,
  settingsManager
) {
  const {
    logger,
    config
  } = peertubeHelpers;

  if (store.client) {
    unregisterExternalAuth('oauth2');
  }

  store.client = null;
  store.userAuthenticated = null;

  const settingNames = [
    'accessTokenParam',
    'authorizePath',
    'clientId',
    'clientSecret',
    'domain',
    'identityPath',
    'sendIdentityTokenViaHeader',
    'identityUsernameField',
    'scope',
    'tokenPath',
    'authDisplayName'
  ];
  const {
    accessTokenParam,
    authorizePath,
    clientId,
    clientSecret,
    domain,
    identityPath,
    sendIdentityTokenViaHeader,
    identityUsernameField,
    scope,
    tokenPath
  } = await settingsManager.getSettings(settingNames);

  if (!clientId) {
    logger.info(
      'Did not register external auth because client ID is not set.'
    );
    return;
  }
  if (!clientSecret) {
    logger.info(
      'Did not register external auth because client secret is not set.'
    );
    return;
  }
  if (!domain) {
    logger.info(
      'Do not register external auth because domain is not set.'
    );
    return;
  }
  if (!scope) {
    logger.info(
      'Do not register external auth because scope is not set.'
    );
    return;
  }
  if (!authorizePath) {
    logger.info(
      'Did not register external auth because authorize URL path is not set.'
    );
    return;
  }
  if (!tokenPath) {
    logger.info(
      'Did not register external auth because token URL path is not set.'
    );
    return;
  }
  if (!identityPath) {
    logger.info(
      'Did not register external auth because identity URL path is not set.'
    );
    return;
  }
  if (!sendIdentityTokenViaHeader && !accessTokenParam) {
    logger.info(
      'Did not register external auth because access token parameter is not set.'
    );
    return;
  }

  store.scope = scope.trim();
  store.domain = domain;
  store.accessTokenParam = accessTokenParam;
  store.identityPath = identityPath;
  store.sendIdentityTokenViaHeader = sendIdentityTokenViaHeader;
  store.identityUsernameField = identityUsernameField;

  const webserverUrl = config.getWebserverUrl();
  store.redirectUrl = `${webserverUrl}/plugins/auth-oauth2/router/callback`;

  store.client = new ClientOAuth2({
    clientId,
    clientSecret,
    accessTokenUri: `https://${domain}${tokenPath}`,
    authorizationUri: `https://${domain}${authorizePath}`
  })
  const result = registerExternalAuth({
    authName: 'oauth2',
    authDisplayName: () => store.authDisplayName,
    onAuthRequest: async (req, res) => {
      try {
        const authorizationUri = store.client.code.getUri(
          {
            redirectUri: store.redirectUrl,
            scopes: store.scope.split(/\s+/),
            state: store.stateKey
          }
        );
        return res.redirect(authorizationUri);
      } catch (err) {
        logger.error('Cannot handle auth request.', { err });
        return redirectOnError(res);
      }
    }
  });
  store.userAuthenticated = result.userAuthenticated;
}

async function register({
  registerExternalAuth,
  unregisterExternalAuth,
  registerSetting,
  settingsManager,
  peertubeHelpers,
  getRouter,
}) {
  const { logger } = peertubeHelpers;

  registerSetting({
    name: 'authDisplayName',
    label: 'OAuth2 provider display name',
    type: 'input',
    private: true,
    default: 'OAuth2',
  });
  registerSetting({
    name: 'clientId',
    label: 'Client ID (required)',
    type: 'input',
    private: true
  });
  registerSetting({
    name: 'clientSecret',
    label: 'Client secret (required)',
    type: 'input',
    private: true
  });
  registerSetting({
    name: 'domain',
    label: 'Domain (required) example: auth.example.com',
    type: 'input',
    private: true
  });
  registerSetting({
    name: 'scope',
    label: 'Scope (required)',
    type: 'input',
    private: true,
    default: 'email openid profile'
  });
  registerSetting({
    name: 'authorizePath',
    label: 'Authorize URL path (required) example: /oauth2/authorize',
    type: 'input',
    private: true,
    default: ''
  });
  registerSetting({
    name: 'tokenPath',
    label: 'Token URL path (required) example: /oauth2/token',
    type: 'input',
    private: true,
    default: ''
  });
  registerSetting({
    name: 'identityPath',
    label: 'Identity URL path (required) example: /oauth2/userInfo',
    type: 'input',
    private: true,
    default: ''
  });
  registerSetting({
    name: 'identityUsernameField',
    label: 'Identity username field (required)',
    type: 'input',
    private: true,
    default: 'username'
  });
  registerSetting({
    name: 'sendIdentityTokenViaHeader',
    label: 'Send identity token sent via HTTP header? (required for AWS Cognito)',
    type: 'input-checkbox',
    private: true
  });
  registerSetting({
    name: 'accessTokenParam',
    label: 'Identity access token URL parameter name (required if the identity access token is sent via the URL)',
    type: 'input',
    private: true,
    default: ''
  });

  const router = getRouter();
  router.use('/callback', (req, res) => handleCallback(
    peertubeHelpers,
    settingsManager,
    req,
    res
  ));

  const stateKeyBuf = await getRandomBytes(16);
  store.stateKey = stateKeyBuf.toString('hex');
  await loadSettingsAndCreateClient(
    registerExternalAuth,
    unregisterExternalAuth,
    peertubeHelpers,
    settingsManager
  ).catch(err => logger.debug('Cannot load settings and create client', { err }));

  const authDisplayNameSetting = await settingsManager.getSetting('authDisplayName');
  if (authDisplayNameSetting) {
    store.authDisplayName = authDisplayNameSetting;
  }

  settingsManager.onSettingsChange(settings => {
    loadSettingsAndCreateClient(
      registerExternalAuth,
      unregisterExternalAuth,
      peertubeHelpers,
      settingsManager
    ).catch(
      err => logger.error('Cannot load settings and create client after settings changes.', { err })
    )
    if (settings['authDisplayName']) {
      store.authDisplayName = settings['authDisplayName'];
    }
  })
}

async function unregister() {
  return
}

module.exports = {
  register,
  unregister
};
