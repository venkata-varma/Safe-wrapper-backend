exports.validateServiceProviders = async (bodyData) => {
    // Find integration credentails and then decrypt and pull CPD calls.
    let encrypted = { iv: process.env.CRYPTO_IV, encryptedData: bodyData };
    let decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY));
     
    let createConfig = {
        method: decryptConfigCredentials.serviceMethod,
        maxBodyLength: Infinity,
        url: decryptConfigCredentials.baseUrl,
        headers: decryptConfigCredentials.headers,
        data: decryptConfigCredentials.requestMethod === "body" ? querystring.stringify(decryptConfigCredentials.data) : decryptConfigCredentials.data
    };
    try {
        const authResponse = await axios.request(createConfig)
        responseData = decryptConfigCredentials.requestMethod === "body" ? authResponse.data : decryptConfigCredentials.headers
        return {
            statusCode:authResponse.status, 
            status: customConstants.messages.MESSAGE_SUCCESS,
            message:customConstants.messages.MESSAGE_VALIDATE_SERVICEPROVIDER_SUCCESS, 
            requestMethod:decryptConfigCredentials.requestMethod,
            responseData 
        };
    } catch (error) {
        console.log('ERORRR:===',error)
        return {statusCode:error.response.status, status: customConstants.messages.MESSAGE_FAIL, message:customConstants.messages.MESSAGE_VALIDATE_SERVICEPROVIDER_FAILED };
    }
};  