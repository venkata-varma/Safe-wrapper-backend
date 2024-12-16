const axios = require('axios');
/**
 * Generic function to handle different authentication types.
 * @param {string} authType - The type of authentication (e.g., 'basicAuth', 'oauth1', 'oauth2', 'apiKey', 'bearerToken').
 * @param {object} authDetails - Details required for the specified authentication type.
 * @param {object} requestConfig - Axios request configuration object.
 * @returns {Promise} - Axios response.
 */
async function handleAuthentication(authType, authDetails, requestConfig) {
    try {
        switch (authType) {
            case 'basicAuth': {
                const { username, password } = authDetails;
                requestConfig.auth = { username, password };
                break;
            }

            case 'oauth1': {
                const { clientId, secreteKey, grantType = 'client_credentials' } = authDetails;

                break;
            }

            case 'oauth2': {
                const { accessToken } = authDetails;
                requestConfig.headers = {
                    ...requestConfig.headers,
                    Authorization: `Bearer ${accessToken}`,
                };
                break;
            }

            case 'apiKey': {
                const { key, location, name } = authDetails;
                if (location === 'header') {
                    requestConfig.headers = {
                        ...requestConfig.headers,
                        [name]: key,
                    };
                } else if (location === 'query') {
                    requestConfig.params = {
                        ...requestConfig.params,
                        [name]: key,
                    };
                }
                break;
            }

            case 'bearerToken': {
                const { token } = authDetails;
                requestConfig.headers = {
                    ...requestConfig.headers,
                    Authorization: `Bearer ${token}`,
                };
                break;
            }

            default:
                throw new Error(`Unsupported authentication type: ${authType}`);
        }

        // Make the authenticated request
        const response = await axios(requestConfig);
        return response.data;
    } catch (error) {
        console.error(`Error in handleAuthentication: ${error.message}`);
        throw error;
    }
}

module.exports = handleAuthentication;
