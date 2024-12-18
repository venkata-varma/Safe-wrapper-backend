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