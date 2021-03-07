# Mastodon OAuth 2.0 server plugin for PeerTube

This PeerTube server plugin adds support to a PeerTube instance for external authentication via a Mastodon OAuth 2.0 provider.

## Dependencies

  * **NodeJS >= 10.x**
  * **PeerTube >= 2.2.0**

## OAuth 2.0 Provider Requirements

To properly use this plugin, the OAuth 2.0 provider must support confidential clients. See [RFC6749: 2.1. Client Types](https://tools.ietf.org/html/rfc6749#section-2.1).

> Note: [Nextcloud's](https://docs.nextcloud.com/server/20/admin_manual//configuration_server/oauth2.html) OAuth2 implementation is not supported.

## Configuration

The redirection endpoint provided by this plugin is available at `/plugins/auth-oauth2/router/callback`.  Use the following URI in your OAuth 2.0 provider's `callback URL` or `redirection URI` setting.

`https://<your instance hostname>/plugins/auth-oauth2/router/callback`

> Note: Replace `<your instance hostname>` with the hostname of your PeerTube instance.

## Plugin Settings

To activate the plugin, configure the following settings after installation:

| Setting | Required? | Description |
| :------------ | :---------------: | :----- |
| Provider display name | | The text that is displayed in a button next to the login form. |
| Client ID      | yes | The client id string assigned to you by the provider. |
| Client secret |  yes | The client secret string assigned to you by the provider. |
| Domain | yes | The fully qualified domain name for the provider. *example: `auth.example.com`* |
| Scope | yes | One or more Scope names separated by a single space. |
| Authorize URL path | yes | The URL from the provider that signs the user in. *example: `/oauth2/authorize`* |
| Token URL path | yes | The URL from the provider that gets the user's access tokens. *example: `/oauth2/token`* |
| Identity URL path | yes | The URL from the provider that returns information about the authenticated user in a JSON format. *example: `/api/v1/accounts/verify_credentials`* |
| Identity username field | yes | The name of the field that contains the user's username. |
| Send identity token sent via HTTP header?  | | Enable this setting to pass the access token using the `Authorization` header when requesting information about the authenticated user. *Required for AWS Cognito.* |
| Identity access token URL parameter name  | | The URL parameter name used to pass the access token when requesting information about the authenticated user. *Required if the access token is sent via the URL.* |

> Note:  The plugin will not function if the required settings are missing or if the settings for the provider are incorrect.

### Troubleshooting Tips

Review the PeerTube logs for error messages related to this plugin.

## License

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
