
const cardconnectIntegrationsMastersModel = require('../models/cardConnectIntegrationsMasterModel')
const cardconnectIntegrationsCredentialsModel = require('../models/cardConnectIntegrationsCredentialsModel')
const cardConnectIntegrationsSettingsModel = require('../models/cardConnectIntegrationsSettingsModel')
let { decryptData } = require('../../utils/encryptionAlgorithms')
let customConstants = require('../../config/constants.json')
let axios = require('axios')
const cardConnectTransactionsModel = require('../models/cardConnectTransactionsModel')
const { GlobalHTTPMethods } = require('../middleware/globalHttpModel')
const { cardConnectExceptionLogs } = require('../middleware/cardConnectExceptionOperations')



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





const modifyUrl = async (baseUrl, integrationsMasterCredentials, dateInput) => {


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



exports.processAPIUrlFlows = async (apiUrlFlows, getAuthenticated, integrationsMasterCredentials, date, req) => {
    var totalInserted = 0;
    var totalFetched = 0;
    for (let urlFlow of apiUrlFlows) {

        let cardConnectUrl = urlFlow.url;

        let prepareUrlWithPKV = await modifyUrl(cardConnectUrl, integrationsMasterCredentials, date);
        console.log("prepareUrlWithPKV===", prepareUrlWithPKV)
        if (urlFlow.paginationRequired === true) {


            let page = 1;

            while (true) {
                let finalUrl = `${prepareUrlWithPKV}&page=${page}&limit=10000`;

                // let response = await axios.get(finalUrl, {
                //     headers: getAuthenticated?.requestMethod === "headers" ? getAuthenticated.responseData : {},
                //     data: getAuthenticated?.requestMethod === "body" ? getAuthenticated.responseData : {}
                // });
                let response = await GlobalHTTPMethods.handleGet(finalUrl, getAuthenticated, integrationsMasterCredentials);

                let txns = urlFlow.dataMappingPath[0] ? response[urlFlow.dataMappingPath[0]] : response;

                totalFetched += txns.length;

                if (txns.length > 0) {
                    try {
                        // prepare bulk insert objects
                        let recordsToInsert = txns.map(txn => ({
                            cardConnectIntegrationsMasterId: integrationsMasterCredentials.cardConnectIntegrationsMasterId,
                            accountId: integrationsMasterCredentials.accountId,
                            userId: integrationsMasterCredentials.userId,
                            transaction: txn,
                            referenceId: txn[urlFlow.filteredReferenceId],
                            referenceStatus: txn[urlFlow.statusKey],
                            createdBy: req.user._id
                        }));

                        // bulk insert
                        let consoleInsertMany = await cardConnectTransactionsModel.insertMany(recordsToInsert, { ordered: false });

                        totalInserted += consoleInsertMany.length;
                    } catch (error) {
                        if (error?.writeErrors?.length) {
                            for (let writeErr of error.writeErrors) {
                                let failedDoc = recordsToInsert[writeErr.index]; // the txn that failed
                                await cardConnectExceptionLogs(
                                    integrationsMasterCredentials,
                                    error?.code,
                                    writeErr.errmsg || JSON.stringify(writeErr),
                                    error?.name,
                                    failedDoc.transaction, // request object
                                    finalUrl,
                                    failedDoc.referenceId // <-- log referenceId here
                                );
                            }
                        } else {
                            await cardConnectExceptionLogs(
                                integrationsMasterCredentials,
                                error.response?.status,
                                error?.response?.data?.Message || JSON.stringify(error?.response?.data),
                                error?.name,
                                error?.config?.data === undefined ? error?.config?.url : error?.config?.data,
                                finalUrl,
                                "" // no txn-specific info
                            );
                        }



                      //  await cardConnectExceptionLogs(integrationsMasterCredentials, error.response?.status, error?.response?.data?.Message || JSON.stringify(error?.response?.data), error?.name, error?.config?.data === undefined ? error?.config?.url : error?.config?.data, finalUrl, "")
                    }

                }



                console.log(`Fetched page ${page}, ${txns.length} records`);

                if (txns.length === 0) break;
                if (txns.length < 10000) break;
                page++;

                if (urlFlow?.rateLimit?.status === true && urlFlow.rateLimit?.limit) {
                    let delayMs = (60 / urlFlow.rateLimit.limit) * 1000;
                    // Only wait if you're going to fetch the next page
                    await new Promise(res => setTimeout(res, delayMs));
                }

            }


        }

    }


    return {
        totalInserted,
        totalFetched
    }


}