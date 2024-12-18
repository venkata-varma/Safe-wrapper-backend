const axios = require('axios')
const querystring = require('querystring')
const customConstants = require('../config/constants.json')

exports.basicAuth = async (username, password, url) => {
    const token = Buffer.from(`${username}:${password}`).toString('base64');

    try {
        const response = await axios.post(url, {
            headers: {
                Authorization: `Basic ${token}`,
                'Content-Type': 'application/json', // Adjust if the content type is different
            },
        });

        console.log('Response from external URL:', response.data);
    } catch (error) {
        console.error('Error calling external URL:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

/*
exports.checkOAuth = async ({baseUrl,clientId, secreteKey, grantType = 'client_credentials'}) => {
    try {
        const authResponse = await axios.post(
            `${baseUrl}`,
            // `client_id=${clientId}&client_secret=${secreteKey}&grant_type=${grantType}`

        );
        
        return {status: "success", ...authResponse.data};
    } catch (error) {
        if(error.response.status == 400) {
            return {status: "fail", message: "Invalid Credentials"}
        }
    }
}
    */

exports.validateServiceProviders = async (bodyData) => {
    let createConfig = {
        method: bodyData.serviceMethod,
        maxBodyLength: Infinity,
        url: bodyData.baseUrl,
        headers: bodyData.headers,
        data: bodyData.requestMethod === "body" ? querystring.stringify(bodyData.data) : bodyData.data
    };
    try {
        const authResponse = await axios.request(createConfig)
        return {statusCode:authResponse.status, status: customConstants.messages.MESSAGE_SUCCESS,message:customConstants.messages.MESSAGE_VALIDATE_SERVICEPROVIDER_SUCCESS, responseData:authResponse.data };
    } catch (error) {
        console.log('ERORRR:===',error)
        return {statusCode:error.response.status, status: customConstants.messages.MESSAGE_FAIL, message:customConstants.messages.MESSAGE_VALIDATE_SERVICEPROVIDER_FAILED };
    }
};

