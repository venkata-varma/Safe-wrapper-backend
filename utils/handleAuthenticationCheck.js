const handleAuthentication = require('./handleAuthentication');

(async () => {
    try {
        // Example for Basic Auth
        const basicAuthConfig = {
            method: 'GET',
            url: 'https://api.example.com/resource',
        };
        const basicAuthDetails = { username: 'user', password: 'pass' };
        const data = await handleAuthentication('basicAuth', basicAuthDetails, basicAuthConfig);
        console.log('Basic Auth Response:', data);

        // Example for Bearer Token
        const bearerTokenConfig = {
            method: 'GET',
            url: 'https://api.example.com/resource',
        };
        const bearerTokenDetails = { token: 'your-token-here' };
        const bearerData = await handleAuthentication('bearerToken', bearerTokenDetails, bearerTokenConfig);
        console.log('Bearer Token Response:', bearerData);

        // Example for OAuth2
        const oauth2Config = {
            method: 'GET',
            url: 'https://api.example.com/resource',
        };
        const oauth2Details = { accessToken: 'your-access-token-here' };
        const oauth2Data = await handleAuthentication('oauth2', oauth2Details, oauth2Config);
        console.log('OAuth2 Response:', oauth2Data);

    } catch (error) {
        console.error('Error:', error);
    }
})();
