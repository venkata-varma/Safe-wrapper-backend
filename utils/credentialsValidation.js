let axios = require('axios')
const querystring=require('querystring')
const customConstants = require('../config/constants.json')

exports.validateServiceProviders = async (payload) => {
    var baseEncoded;
    if (payload?.credentials?.requestMethod === 'headers' && payload?.authorizationType === 'Basic auth') {
        baseEncoded = Buffer.from(`${payload?.credentials?.headers?.username}:${payload?.credentials?.headers?.password}`).toString('base64');
        baseEncoded = `Basic ${baseEncoded}`
    }
    var giveHeaders = {};
    if (baseEncoded) {
        giveHeaders = {
            [payload?.authenticationKey]: baseEncoded
        }

    } else {
        giveHeaders = payload?.credentials?.headers
    }

    let createConfig = {
        method: payload?.credentials?.serviceMethod,
        maxBodyLength: Infinity,
        url: payload?.credentials?.baseUrl,
        headers: giveHeaders,
        data: payload?.credentials?.requestMethod === "body" ? querystring.stringify(payload?.credentials?.data) : payload?.credentials?.data
    };

    //console.log("createConfig===", createConfig)

    try {
        const authResponse = await axios.request(createConfig);

        return { statusCode: authResponse?.status, status: customConstants.messages.MESSAGE_SUCCESS, message: customConstants.messages.MESSAGE_CARD_CONNECT_CREDENTIALS_VALIDATION_SUCCESS, responseData: authResponse.data };
    } catch (error) {
        // console.log('ERORRR:===',error)
        return { statusCode: error?.response?.status,statusText:error?.response?.statusText, status: customConstants?.messages?.MESSAGE_FAIL, message: customConstants?.messages?.MESSAGE_CARD_CONNECT_CREDENTIALS_VALIDATION_FAILED, data: error?.response?.data };
    }
};

