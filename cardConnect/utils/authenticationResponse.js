

const cardconnectIntegrationsCredentialsModel = require('../models/cardConnectIntegrationsCredentialsModel')
const cardConnectIntegrationsSettingsModel = require('../models/cardConnectIntegrationsSettingsModel')
let { decryptData } = require('../../utils/encryptionAlgorithms')
let customConstants = require('../../config/constants.json')
let axios = require('axios')
const cardConnectTransactionsModel = require('../models/cardConnectTransactionsModel')
const cardConnectTransactionLifeCycleModel = require('../models/cardConnectTransactionLifeCycle')
const { GlobalHTTPMethods } = require('../middleware/globalHttpModel')
const { cardConnectExceptionLogs } = require('../middleware/cardConnectExceptionOperations')
const { generateDateRange } = require('./helpers')
const cardConnectIntegrationsCronsModel = require('../models/cardConnectIntegrationsCronsModel')
const { default: mongoose } = require('mongoose')
const accountsModel = require('../../models/accountsModel')

//-----------------------------------------------------------------------


async function createTransactionLifeCycleRecord(requestObject, integrationsMasterCredentials) {
    await cardConnectTransactionLifeCycleModel.create({

        accountId: integrationsMasterCredentials?.accountId,
        userId: integrationsMasterCredentials?.userId,
        transactionId: requestObject?.referenceId,
        transactionStatus: requestObject?.referenceStatus,
        responseObject: JSON.stringify(requestObject?.responseObject),
        customerDetails: requestObject?.customerDetails
    })



    // let findExisting = await cardConnectTransactionLifeCycleModel.findOne(
    //     {
    //         accountId: integrationsMasterCredentials?.accountId,
    //         transactionId: requestObject?.referenceId,
    //         transactionStatus: requestObject?.referenceStatus
    //     }
    // );
    // if (!findExisting) {
    //     await cardConnectTransactionLifeCycleModel.create({

    //         accountId: integrationsMasterCredentials?.accountId,
    //         userId: integrationsMasterCredentials?.userId,
    //         transactionId: requestObject?.referenceId,
    //         transactionStatus: requestObject?.referenceStatus,
    //         responseObject: JSON.stringify(requestObject?.responseObject)
    //     })
    // } else if (findExisting) {
    //     console.log("record with same status exisis")
    //     return;
    // }

}


async function upSertRecord(txns, integrationsMasterCredentials, urlFlow, finalUrl, integrationsCronId, getAuthenticated) {
    let accountRecord = await accountsModel.findOne({ _id: new mongoose.Types.ObjectId(integrationsMasterCredentials?.accountId) })
    let totalInserted = 0;
    let totalUpdated = 0;



    let results = await Promise.allSettled(
        txns.map(async (txn) => {
            try {
                txn = {
                    ...txn,
                    merchid: integrationsMasterCredentials?.primaryKeyValues?.merchantId
                }

                let filter = {
                    accountId: integrationsMasterCredentials?.accountId,
                    referenceId: txn[urlFlow?.filteredReferenceId]
                };

                let existingRecord = await cardConnectTransactionsModel.findOne(filter);



                let requestObject = {

                    accountId: integrationsMasterCredentials?.accountId,
                    merchantName: accountRecord?.accountName,
                    userId: integrationsMasterCredentials?.userId,
                    responseObject: txn,
                    cardConnectIntegrationsCronIdCreate: new mongoose.Types.ObjectId(integrationsCronId),
                    referenceId: txn[urlFlow?.filteredReferenceId],
                    referenceStatus: txn[urlFlow?.statusKey],

                    //There is one array in settins for keys for below customerDetails. 
                    // we can obviously use that, loop and get the key-value pairs. But, as of now, to lessen time and do it if it is realy necessary when other Stripe or other arrives.
                    customerDetails: {
                        cardNumber: txn?.cardnumber,
                        cardBrand: txn?.cardbrand,
                        cardType: txn?.cardtype
                    }
                };

                if (!existingRecord) {
                    await cardConnectTransactionsModel.create(requestObject);
                    //  await createTransactionLifeCycleRecord(requestObject, integrationsMasterCredentials);
                    await cardConnectIntegrationsCronsModel.findByIdAndUpdate(
                        integrationsCronId,
                        { $inc: { pushedCount: 1 } },
                        { new: true, runValidators: true }
                    );
                    return { inserted: 1, updated: 0 };

                } else if (existingRecord.referenceStatus !== txn[urlFlow.statusKey]) {
                    await cardConnectTransactionsModel.updateOne(
                        { _id: existingRecord?._id },
                        {
                            $set: {
                                referenceStatus: txn[urlFlow?.statusKey],
                                responseObject: txn,
                                cardConnectIntegrationsCronIdUpdate: new mongoose.Types.ObjectId(integrationsCronId)
                            }
                        }
                    );
                    //    await createTransactionLifeCycleRecord(requestObject, integrationsMasterCredentials);
                    await cardConnectIntegrationsCronsModel.findByIdAndUpdate(
                        integrationsCronId,
                        { $inc: { updatedCount: 1 } },
                        { new: true, runValidators: true }
                    );
                    return { inserted: 0, updated: 1 };
                }

                return { inserted: 0, updated: 0 };

            } catch (error) {
                console.error("Error in upsert for txn:", error);
                await cardConnectExceptionLogs(
                    integrationsMasterCredentials,
                    error.response?.status || 500,
                    error?.message,
                    error?.name,
                    txn,
                    finalUrl,
                    txn[urlFlow?.filteredReferenceId],
                    integrationsCronId
                );
                return { inserted: 0, updated: 0 };
            }
        })
    );

    // aggregate results
    for (const r of results) {
        if (r.status === "fulfilled") {
            totalInserted += r.value.inserted;
            totalUpdated += r.value.updated;
        }
    }

    return { totalInserted, totalUpdated };
}


















async function getNestedValue(obj, path) {
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


/**
 * 
 * @param {*} accountId 
 * @returns 
 */
async function authenticationResponse(accountId) {

    let integrationsMasterCredentials = await cardconnectIntegrationsCredentialsModel.findOne({ accountId });


    if (!integrationsMasterCredentials || !integrationsMasterCredentials.credentials) {

        throw new Error("Credentials not found.")
    }

    let encrypted = { iv: process.env.CRYPTO_IV, encryptedData: integrationsMasterCredentials.credentials };
    let decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY));
    // console.log("decryptConfigCredentials====", decryptConfigCredentials)



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




/**
 * 
 * @param {*} baseUrl 
 * @param {*} integrationsMasterCredentials 
 * @param {*} dateInput 
 * @param {*} primaryKeyValues 
 * @param {*} currentRecord 
 * @returns 
 */
async function modifyUrl(baseUrl, integrationsMasterCredentials, dateInput) {


    for (let [key, value] of Object.entries(integrationsMasterCredentials.primaryKeyValues)) {

        const placeholder = `{{${key}}}`;

        baseUrl = baseUrl.replaceAll(placeholder, value);
    }


    // if (dateInput) {
    //     // Remove hyphens
    //     const formattedDate = dateInput.replace(/-/g, "");
    //     baseUrl = baseUrl.replaceAll("{{date}}", formattedDate);
    // }
    if (baseUrl.includes('{{date}}')) {
        const formattedDate = dateInput.replace(/-/g, "");
        baseUrl = baseUrl.replaceAll("{{date}}", formattedDate);
    }



    return baseUrl


}






/**
 * 
 * @param {*} apiUrlFlows 
 * @param {*} getAuthenticated 
 * @param {*} integrationsMasterCredentials 
 * @param {*} date 
 * @param {*} integrationsCronId 
 */
const processAPIUrlFlows = async (apiUrlFlows, getAuthenticated, integrationsMasterCredentials, date, integrationsCronId) => {
    var upsertRecord = {
        totalInserted: 0,
        totalUpdated: 0
    };



    for (let urlFlow of apiUrlFlows) {

        let cardConnectUrl = urlFlow.url;

        let prepareUrlWithPKV = await modifyUrl(cardConnectUrl, integrationsMasterCredentials, date);
        console.log("prepareUrlWithPKV===", prepareUrlWithPKV)
        if (urlFlow.paginationRequired === true) {


            let page = 1;

            while (true) {
                let finalUrl = `${prepareUrlWithPKV}&page=${page}&limit=10000`;

                let response = await GlobalHTTPMethods.handleGet(finalUrl, getAuthenticated, integrationsMasterCredentials);
                if (Array.isArray(urlFlow.dataMappingPath) && urlFlow.dataMappingPath.length > 0) {

                    txns = response?.[urlFlow.dataMappingPath[0]] ?? [];

                } else {
                    // No mapping → assume whole response is transactions
                    txns = response ?? [];
                }




                totalFetched = txns.length;
                await cardConnectIntegrationsCronsModel.findByIdAndUpdate(integrationsCronId, { $inc: { pulledCount: totalFetched } }, { new: true, runValidators: true })
                console.log(`Fetched page ${page}, ${txns.length} records`);
                if (txns.length > 0) {
                    upsertRecord = await upSertRecord(txns, integrationsMasterCredentials, urlFlow, finalUrl, integrationsCronId, getAuthenticated);
                    console.log("upsertRecord===", upsertRecord)
                }





                if (txns.length === 0) break;
                if (txns.length < 10000) break;
                page++;

                if (urlFlow?.rateLimit?.status === true && urlFlow.rateLimit?.limit) {
                    //    let delayMs = (60 / urlFlow.rateLimit.limit) * 1000;
                    let delayMs = 1;
                    // Only wait if you're going to fetch the next page
                    await new Promise(res => setTimeout(res, delayMs));
                }

            }


        } else {
            //
            console.log("pagination not required case")
        }

    }


    return {
        date,
        totalFetched,
        ...upsertRecord
    }

}




/**
 * 
 * @param {*} dateRange 
 * @param {*} integrationsMasterDetails 
 * @param {*} accountId 
 * @param {*} integrationsCronId 
 */
async function initiateManualTrigger(dateRange, integrationsMasterDetails, accountId, integrationsCronId) {



    for (let date of dateRange) {
        console.log("Cron running for date===", date)
        let getAuthenticated = await authenticationResponse(accountId);
        //     console.log("getAuthenticated===", getAuthenticated)

        let apiUrlFlows = integrationsMasterDetails.cardconnectintegrationsapiurlflows.APIUrlFlows;
        apiUrlFlows = apiUrlFlows.filter((url) => url.status === 'active');

        let processFlows = await processAPIUrlFlows(apiUrlFlows, getAuthenticated, integrationsMasterDetails.cardconnectintegrationscredentials, date, integrationsCronId);
        console.log("processFlows===", processFlows)


    }


}



module.exports = {
    getNestedValue,
    authenticationResponse,
    modifyUrl,
    processAPIUrlFlows,
    upSertRecord,
    initiateManualTrigger


}