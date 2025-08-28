
const cardconnectIntegrationsMastersModel = require('../models/cardConnectIntegrationsMasterModel')
const cardconnectIntegrationsCredentialsModel = require('../models/cardConnectIntegrationsCredentialsModel')
const cardConnectIntegrationsSettingsModel = require('../models/cardConnectIntegrationsSettingsModel')
let { decryptData } = require('../../utils/encryptionAlgorithms')
let customConstants = require('../../config/constants.json')
let axios = require('axios')

const getNestedValue = (obj, path) => {
    const traverse = (current, parts) => {
        if (current === undefined || current === null) return undefined;
        if (parts.length === 0) return current;

        const part = parts[0];

        if (part.endsWith("[]")) {
            const key = part.slice(0, -2);
            const array = current[key];
            if (!Array.isArray(array)) return undefined;
            const remainingParts = parts.slice(1);

            for (const item of array) {
                const result = traverse(item, remainingParts);
                if (result !== undefined) return result; // return first non-undefined
            }
            return undefined;
        } else {
            return traverse(current[part], parts.slice(1));
        }
    };

    const parts = path.split(".");
    return traverse(obj, parts);
};



exports.authenticationResponse = async (cardConnectIntegrationsMasterId) => {

    let integrationsMasterCredentials = await cardconnectIntegrationsCredentialsModel.findOne({ cardConnectIntegrationsMasterId });


    if (!integrationsMasterCredentials || !integrationsMasterCredentials.credentials) {

        throw new Error("Credentials not found.")
    }

    let encrypted = { iv: process.env.CRYPTO_IV, encryptedData: integrationsMasterCredentials.credentials };
    let decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY));
    console.log("decryptConfigCredentials====", decryptConfigCredentials)



    var baseEncoded;
    if (decryptConfigCredentials.requestMethod === 'headers' && integrationsMasterCredentials.authorizationType === 'Basic auth') {
        baseEncoded = Buffer.from(`${decryptConfigCredentials.headers.username}:${decryptConfigCredentials.headers.password}`).toString('base64');
        baseEncoded = `Basic ${baseEncoded}`
    }

    var giveHeaders = {};
    if (baseEncoded) {
        giveHeaders = {
            [integrationsMasterCredentials.authenticationKey]: baseEncoded
        }

    } else {
        giveHeaders = decryptConfigCredentials.headers
    }

    let createConfig = {
        method: decryptConfigCredentials.serviceMethod,
        maxBodyLength: Infinity,
        url: decryptConfigCredentials.baseUrl,
        headers: giveHeaders,
        data: decryptConfigCredentials.requestMethod === "body" ? querystring.stringify(decryptConfigCredentials.data) : decryptConfigCredentials.data
    };



    try {
        const authResponse = await axios.request(createConfig);
        const token = decryptConfigCredentials.requestMethod === "body" ? getNestedValue(authResponse.data, integrationsMasterCredentials.dataMappingPath) : decryptConfigCredentials.headers;
        responseData = decryptConfigCredentials.requestMethod === "body" ? authResponse.data : decryptConfigCredentials.headers;
        console.log(",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,")
        return {
            statusCode: authResponse.status,
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_CARD_CONNECT_CREDENTIALS_VALIDATION_SUCCESS,
            requestMethod: decryptConfigCredentials.requestMethod,
            responseData: (decryptConfigCredentials.requestMethod === 'headers' && integrationsMasterCredentials.authorizationType === 'Basic auth') ?
                {
                    [integrationsMasterCredentials.authenticationKey]: `Basic ${Buffer.from(`${decryptConfigCredentials.headers.username}:${decryptConfigCredentials.headers.password}`).toString('base64')}`
                } : (decryptConfigCredentials.requestMethod === 'body') ?
                    {
                        [integrationsMasterCredentials.authenticationKey]: `${token}`
                    } :
                    {
                        [integrationsMasterCredentials.authenticationKey]: `${token}`
                    }

        };



    } catch (error) {
        //console.log('ERORRR:===', error)
        return { statusCode: error?.response?.status, statusText: error?.response?.statusText, status: customConstants.messages.MESSAGE_FAIL, message: customConstants.messages.MESSAGE_CARD_CONNECT_CREDENTIALS_VALIDATION_FAILED, data: error?.response?.data }
    }






}





exports.modifyUrl = async (baseUrl, integrationsMasterCredentials, dateInput) => {


    for (let [key, value] of Object.entries(integrationsMasterCredentials.primaryKeyValues)) {

        const placeholder = `{{${key}}}`;

        baseUrl = baseUrl.replaceAll(placeholder, value);
    }

    
    if (dateInput) {
        // Remove hyphens
        const formattedDate = dateInput.replace(/-/g, "");
        baseUrl = baseUrl.replaceAll("{{date}}", formattedDate);
    }



    return baseUrl


}