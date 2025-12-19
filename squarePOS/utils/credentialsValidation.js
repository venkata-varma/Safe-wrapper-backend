let axios = require('axios')
const querystring = require('querystring')
const customConstants = require('../../config/constants.json')

exports.validateServiceProviders = async (payload) => {
    let authHeaderValue;

    // Handle Basic Auth (Existing logic)
    if (payload?.authorizationType === 'Basic auth') {
        const base64 = Buffer.from(`${payload.credentials.headers.username}:${payload.credentials.headers.password}`).toString('base64');
        authHeaderValue = `Basic ${base64}`;
    }
    // Handle Square Bearer Token (New logic)
    else if (payload?.authorizationType === 'Bearer') {
        authHeaderValue = `Bearer ${payload.credentials.accessToken}`;
    }

    // Merge Authentication with other headers (like Square-Version)
    const finalHeaders = {
        ...payload.credentials.headers,
        [payload.authenticationKey]: authHeaderValue
    };

    let createConfig = {
        method: payload.credentials.serviceMethod,
        url: payload.credentials.baseUrl,
        headers: finalHeaders,
        data: payload.credentials.data // For GET requests, this will be empty
    };

    try {
        const authResponse = await axios.request(createConfig);
        return {
            statusCode: authResponse.status,
            status: "success",
            responseData: authResponse.data
        };
    } catch (error) {
        return {
            statusCode: error.response?.status || 500,
            status: "fail",
            data: error.response?.data
        };
    }
};