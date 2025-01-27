const { default: mongoose } = require("mongoose");
const CPDWorkordersModel = require("../models/CPDWorkordersModel");
const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");
const integrationsSettingsModel = require("../models/integrationsSettingsModel");
const serviceProviderIntegrationsModel = require("../models/serviceProviderIntegrationsModel");
const serviceProviderServicesModel = require("../models/serviceProviderServicesModel");
const { validateServiceProviders, validateSPAuthentication } = require("./serviceProviderAuthModel");
const { GlobalHTTPMethods } = require("./sourceAndDestinationSyncModel");
const moment = require('moment');
const { addRecordIntoDataBase } = require("./dataBaseOperations");
const serviceProviderList = require("../models/serviceProviderList");
const { decryptData, encryptData } = require("../utils/encryptionAlgorithms");
require("dotenv").config();


let startTestResponseObject = {
    sourceAuthenticationStatus: false,
    destinationAuthenticationStatus: false,
    sourcePullCount: 0,
    destinationPushCount: 0,
}

/**
 * 
 * @param {*} integrationObject holds field N X number of mapping records (Both source & destination)
 * 1. First, we are looping the integration mappings (N X number). 
 * 2. Authenticate & get required tokens
 * 3. Fetch source side data objects by calling API calls.  
 * 4. Insert into source side collections with new status and required data points. 
 */
var destinationSettingsData

const destinationIntegrationOperationsServices = async (integrationObject) => {
    startTestResponseObject = {
        sourceAuthenticationStatus: false,
        destinationAuthenticationStatus: false,
        sourcePullCount: 0,
        destinationPushCount: 0,
    }
    for (const data of integrationObject) {
        // Process each integration data
        destinationSettingsData = await serviceProviderIntegrationsModel.findOne({ from: data.from, to: data.to }).lean();
        await processSIMappings(data);
    }
    return startTestResponseObject
};
/**
 * 
 * @param {*} data holds {} 
 */
const processSIMappings = async (data) => {
    const authToken = await getServiceproviderAuthResponse(data.integrationsMasterId, data.to);
    let integrationDetails = {
        ...data._doc,
    }
    const sortedServices = data.destinationIntegrationServices.sort((a, b) => a.priority - b.priority);
    await processSIServiceCalls(sortedServices, data.integrationsMasterId, data.to, authToken, integrationDetails);
};

const processSIServiceCalls = async (SPServices, integrationsMasterId, sourceProvider, authToken, integrationDetails) => {
    let finalResultData = null; let dataMappingPathKey; let primaryKeyColumn;
    for (serviceObject of SPServices) {
        dataMappingPathKey = serviceObject?.dataMappingPath[0]
        primaryKeyColumn = serviceObject?.primaryKeyColumn[0]
        let sourceRecords
        // console.log('serviceObject:==', serviceObject)
        if (serviceObject.serviceMethod === "post") {
            // console.log('finalResultData:==',finalResultData)
            sourceRecords = await getSourceRecords(integrationDetails, destinationSettingsData?.metrics?.sourceDataBaseName, "initiated")
        }
        if (serviceObject.serviceMethod === "patch") {
            sourceRecords = await getSourceRecords(integrationDetails, destinationSettingsData?.metrics?.sourceDataBaseName, "update-request")
        }
        finalResultData = await preProcessServiceCall(serviceObject, finalResultData, integrationsMasterId, sourceProvider, authToken, integrationDetails, sourceRecords);

    }
    // finalResultData = Array.isArray(finalResultData) ? finalResultData : [finalResultData]
    if (![null, undefined].includes(finalResultData)) {
        for (let eachResult of finalResultData) {
            await preProcessSourceSet(integrationDetails, serviceObject, dataMappingPathKey, primaryKeyColumn, destinationSettingsData?.metrics?.destinationDataBaseName, eachResult, destinationSettingsData?.metrics?.sourceDataBaseName, "destination", eachResult.sourceReferenceId)
            startTestResponseObject.destinationPushCount++
        }
    }
    return startTestResponseObject
}

const processServiceCallsOnSourceRecords = async (integrationsMasterId, sourceProvider, serviceObject, integrationDetails, authToken, sourceRecords, dataMappingPathKey, primaryKeyColumn, finalResultData) => {
    let prePareResult = []
    if (sourceRecords.length > 0) {
        for (let data of sourceRecords) {
            let responseData = {}
            serviceObject.dataToSend = { ...JSON.parse(data.responseObject), ...finalResultData };
            // console.log('serviceObject.dataToSend:==', serviceObject.dataToSend)
            serviceObject.referenceStatus = data.referenceStatus
            serviceObject.sourceReferenceId = data?.sourceReferenceId
            requestObject = await getRequestPayload(integrationsMasterId, sourceProvider, serviceObject, integrationDetails);
            console.log('createRequestObject:===', requestObject)
            let currentResponse = await processIntegrationService(
                serviceObject,
                integrationsMasterId,
                sourceProvider,
                authToken,
                integrationDetails,
                destinationSettingsData?.metrics?.destinationDataBaseName,
                requestObject
            );
            // console.log('currentResponse:==', typeof currentResponse)
            if ((dataMappingPathKey && ![null, undefined].includes(currentResponse) && currentResponse[`${dataMappingPathKey}`]) || currentResponse) {
                responseData = currentResponse[`${dataMappingPathKey}`] || currentResponse
                responseData.sourceReferenceId = data.referenceId;
                prePareResult.push(responseData);
            }
        }
        // console.log('prePareResult:===',prePareResult)
    }
    return prePareResult
}

const preProcessServiceCall = async (serviceObject, finalResultData, integrationsMasterId, sourceProvider, authToken, integrationDetails, sourceRecords) => {

    let dataMappingPathKey = serviceObject?.dataMappingPath[0];
    let primaryKeyColumn = serviceObject?.primaryKeyColumn[0];
    // console.log('finalResultData:===',finalResultData)
    if (finalResultData === null) {
        let dataMappingPathKey = serviceObject.dataMappingPath[0]
        let primaryKeyColumn = serviceObject.primaryKeyColumn[0]
        serviceObject.dependentData = Array.isArray(finalResultData) ? finalResultData[0] : finalResultData
        let serviceCallsResponse = await processServiceCallsOnSourceRecords(integrationsMasterId, sourceProvider, serviceObject, integrationDetails, authToken, sourceRecords, dataMappingPathKey, primaryKeyColumn, serviceObject.dependentData)
        return serviceCallsResponse
    }
    else if (await isMultiRecord(Array.isArray(finalResultData) ? finalResultData : [finalResultData])) {
        let prePareResult = []
        if (serviceObject.serviceMethod === 'post') {

            for (eachResult of finalResultData) {
                serviceObject.dependentData = { ...eachResult }
                let dataMappingPathKey = serviceObject.dataMappingPath[0]
                let primaryKeyColumn = serviceObject.primaryKeyColumn[0]
                serviceObject.sourceReferenceId = eachResult?.sourceReferenceId
                serviceObject.destinationReferenceId = eachResult[`${primaryKeyColumn}`]
                let serviceCallsResponse = await processServiceCallsOnSourceRecords(integrationsMasterId, sourceProvider, serviceObject, integrationDetails, authToken, sourceRecords, dataMappingPathKey, primaryKeyColumn, serviceObject.dependentData)
                return serviceCallsResponse

            }
        }
        else {
            for (eachResult of finalResultData) {
                serviceObject.dependentData = { ...eachResult }
                serviceObject.sourceReferenceId = eachResult?.sourceReferenceId
                serviceObject.destinationReferenceId = eachResult[`${primaryKeyColumn}`]
                const result = await processIntegrationService(
                    serviceObject,
                    integrationsMasterId,
                    sourceProvider,
                    authToken,
                    integrationDetails,
                    destinationSettingsData
                );
                const responseData = result[`${dataMappingPathKey}`]
                const responseToSend = Array.isArray(responseData) ? responseData[0] : responseData;
                prePareResult.push(Object.assign(eachResult, responseToSend))
            }
        }
        return prePareResult
    }

    else if (finalResultData !== null && finalResultData.length === 1) {
        let dataMappingPathKey = serviceObject.dataMappingPath[0]
        let primaryKeyColumn = serviceObject.primaryKeyColumn[0]
        serviceObject.dependentData = Array.isArray(finalResultData) ? finalResultData[0] : finalResultData

        serviceObject.sourceReferenceId = serviceObject.dependentData?.sourceReferenceId
        serviceObject.destinationReferenceId = serviceObject.dependentData[`${primaryKeyColumn}`]

        let prePareResult = []
        if (serviceObject.serviceMethod === 'post') {
            let serviceCallsResponse = await processServiceCallsOnSourceRecords(integrationsMasterId, sourceProvider, serviceObject, integrationDetails, authToken, sourceRecords, dataMappingPathKey, primaryKeyColumn, serviceObject.dependentData)
            return serviceCallsResponse
        }
        else {
            const result = await processIntegrationService(
                serviceObject,
                integrationsMasterId,
                sourceProvider,
                authToken,
                integrationDetails,
                destinationSettingsData
            );
            const responseData = result[`${dataMappingPathKey}`]
            const responseToSend = Array.isArray(responseData) ? responseData[0] : responseData;
            prePareResult.push(Object.assign(serviceObject.dependentData, responseToSend));
            return prePareResult;
        }

    }
    else if (finalResultData.length <= 0 && ![undefined, null].includes(finalResultData[0])) {
        let prePareResult = []
        let dataMappingPathKey = serviceObject.dataMappingPath[0]
        let primaryKeyColumn = serviceObject.primaryKeyColumn[0]
        serviceObject.dependentData = Array.isArray(finalResultData) ? finalResultData[0] : finalResultData
        serviceObject.sourceReferenceId = serviceObject.dependentData?.sourceReferenceId
        serviceObject.destinationReferenceId = serviceObject.dependentData[`${primaryKeyColumn}`]
        const result = await processIntegrationService(
            serviceObject,
            integrationsMasterId,
            sourceProvider,
            authToken,
            integrationDetails,
            destinationSettingsData
        );
        const responseData = result[`${dataMappingPathKey}`]
        const responseToSend = Array.isArray(responseData) ? responseData[0] : responseData;
        prePareResult.push(Object.assign(serviceObject.dependentData, responseToSend))
        return prePareResult
    }
    else {
        return finalResultData
    }
}

const isMultiRecord = async (finalResultData) => {
    return finalResultData.length > 1 ? true : false
}

const preProcessSourceSet = async (integrationDetails, services, dataMappingPathKey, primaryKeyColumn, insertingDataBaseName, currentResponse, updatingDataBaseName, operationType, sourceReferenceId) => {

    if (currentResponse !== undefined) {
        await addRecordIntoDataBase(integrationDetails, services, dataMappingPathKey, primaryKeyColumn, insertingDataBaseName, currentResponse, updatingDataBaseName, "completed", operationType, sourceReferenceId)
    }
}

async function getSourceRecords(integrationDetails, databaseName, status) {
    const records = await mongoose.connection.db
        .collection(`${databaseName}`)
        .find({
            integrationsMasterId: integrationDetails.integrationsMasterId,
            accountId: integrationDetails.accountId,
            status: status,
        });

    const requestDataToBeSent = [];
    for await (const doc of records) {
        integrationDetails.integrationsCronId = doc.integrationsCronId
        requestDataToBeSent.push(doc);
    }
    return requestDataToBeSent
}

const getDestinationRecords = async (integrationDetails, database, sourceReferenceId) => {
    const destinationRecords = await mongoose.connection.db
        .collection(`${database}`)
        .find({
            integrationsMasterId: integrationDetails.integrationsMasterId,
            accountId: integrationDetails.accountId,
            sourceReferenceId: sourceReferenceId
        }).toArray()


    return destinationRecords[0]
}

// Function to process a single service
const processIntegrationService = async (serviceObject, integrationsMasterId, sourceProvider, authToken, integrationDetails, dataBaseName, requestObject) => {
    let responseData

    switch (serviceObject.serviceMethod) {
        case 'post':
            responseData = await GlobalHTTPMethods.handlePost(serviceObject, authToken, requestObject, integrationDetails, dataBaseName);
            break;

        case 'get':
            const getUrl = await modifyUrlsWithDependentData(serviceObject.dataPointUrl, serviceObject.primaryKeyColumn, serviceObject.dependentData);

            responseData = await GlobalHTTPMethods.handleGet(serviceObject, authToken, getUrl[0], integrationDetails, dataBaseName); // Passing modified URL for GET
            break;
        case 'patch':
            const urls = await modifyUrlsWithDependentData(serviceObject.dataPointUrl, serviceObject.primaryKeyColumn, serviceObject.dependentData);

            responseData = await GlobalHTTPMethods.handlePatch(serviceObject, authToken, urls[0], integrationDetails, dataBaseName, requestObject); // Passing modified URL for GET
            break;

        default:
            console.warn(`Unsupported method: ${serviceObject.serviceMethod}`);
            break;
    }
    return responseData;
};


// Helper to modify the URL with dependent data (returns an array of URLs)
const modifyUrlsWithDependentData = async (url, primaryKeyColumn, dependentDataObject) => {
    // console.log('Datasss:==',url, primaryKeyColumn, dependentDataObject)
    let dependentData = Array.isArray(dependentDataObject)
        ? [...dependentDataObject]
        : [dependentDataObject];

    if (!Array.isArray(dependentData) || dependentData.length === 0) {
        console.error('Invalid dependent data, returning original URL.');
        return [url]; // Return an array with the original URL if dependentData is invalid
    }

    let urls = [];

    // Generate a URL for each object in dependentData
    dependentData.forEach(dataObject => {
        let modifiedUrl = url;

        primaryKeyColumn.forEach((key) => {
            const placeholder = `{{${key}}}`;
            let value;
            if (key === 'messageId') {
                value = 'f6b492c9-ee7d-4e1b-a9a8-29f50f0b6d3a'; // Hardcoded value for messageId
            } else {
                value = dataObject[key];
            }

            if (value !== undefined) {
                modifiedUrl = modifiedUrl.replace(placeholder, value); // Replace placeholder with the value
            } else {
                console.warn(`No value found for key: ${key}`); // Log a warning if value is missing
            }
        });

        console.log('Modified URL for work order:', modifiedUrl); // Debugging output for modified URL
        urls.push(modifiedUrl); // Push the generated URL to the array
    });

    return urls; // Return the array of modified URLs
};

/**
 * 
 * @param {*} integrationMasterId 
 * @param {*} sourceServiceProvider
 * 1. Fetch service provider authentication credentials 
 * 2. Validate service provider authentication credentils
 * 3. Find response & find data mappingKey.
 * @returns required authentication credentials say {token, refresh token & others}
 */

async function getServiceproviderAuthResponse(integrationMasterId, sourceServiceProvider) {
    console.log('integrationMasterId:', integrationMasterId, sourceServiceProvider);
    var refresh_token_expires_on;
    let serviceProviderDetails = await integrationsMasterServiceProvidersModel.findOne({
        integrationsMasterId: integrationMasterId,
        serviceProvider: sourceServiceProvider,
    });

    if (!serviceProviderDetails || !serviceProviderDetails.credentials) {
        serviceProviderDetails = await serviceProviderList.findOne({ serviceProviders: sourceServiceProvider })
        // throw new Error('Service provider credentials not found.');
    }

    const authResponse = await validateSPAuthentication(serviceProviderDetails.credentials || serviceProviderDetails.testCredentials).then(async (validationResult) => {
        // console.log('validationResult:==',validationResult)
        if (validationResult.responseData.hasOwnProperty('refresh_token')) {

            refresh_token_expires_on = new Date(new Date().getTime() + validationResult.responseData.refresh_token_expires_in * 1000);
            let encrypted = { iv: process.env.CRYPTO_IV, encryptedData: serviceProviderDetails.credentials || serviceProviderDetails?.testCredentials };
            let decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY));
            decryptConfigCredentials.data.refresh_token = validationResult.responseData.refresh_token
            // console.log("two times", decryptConfigCredentials)
            let newEncryptCode = encryptData(decryptConfigCredentials);
            if (!integrationMasterId) {
                await serviceProviderList.findOneAndUpdate({ serviceProviders: sourceServiceProvider }, { $set: { testCredentials: newEncryptCode, refresh_token_expires_on } }, { new: true, runValidators: true })
            } else if (integrationMasterId) {
                await integrationsMasterServiceProvidersModel.findOneAndUpdate({ integrationsMasterId: integrationMasterId, serviceProvider: sourceServiceProvider }, { $set: { credentials: newEncryptCode, refresh_token_expires_on } }, { new: true, runValidators: true })
            }
        }
        startTestResponseObject.destinationAuthenticationStatus = validationResult.status
        return validationResult.requestMethod === 'body'
            ? { Authorization: `Bearer ${validationResult.responseData[`${serviceProviderDetails.dataMappingPath[0]}`]}`, 'Content-Type': 'application/json' }
            : validationResult.responseData;
    });
    return authResponse;
}




// Main function to get the service payload
async function getRequestPayload(integrationMasterId, sourceServiceProvider, serviceObject, integrationFieldMappingDetails) {
    const updatedPayload = await updatePayloadWithMappings(integrationFieldMappingDetails.mappedDataPoints, destinationSettingsData?.settings?.mappingSettings, serviceObject.dataToSend, destinationSettingsData?.settings?.statusSettings, serviceObject.referenceStatus);

    return updatedPayload;
}

// Fetch service provider service details
async function fetchServiceDetails(serviceProviderServiceId) {
    const serviceDetails = await serviceProviderServicesModel.findById(serviceProviderServiceId);
    if (!serviceDetails) {
        throw new Error('Service details not found.');
    }
    return serviceDetails;
}

// Fetch integration settings
async function fetchIntegrationSettings(integrationsMasterId) {
    const integrationSettings = await integrationsSettingsModel.findOne({ integrationsMasterId });
    if (!integrationSettings) {
        throw new Error('Integration settings not found.');
    }
    return integrationSettings;
}

function assignStatus(statusValue, statusSettings) {
    let statusKey = Object.entries(statusSettings).find(([key, value]) => value === statusValue);

    if (statusKey)
        return statusKey[0];
    else
        return statusValue;

}

async function updatePayloadWithMappings(fieldMapping, destinationMappingSettings, dataToSend, statusSettings, referenceStatus) {
    let mappedDataPoints = {};
    fieldMapping = {
        ...fieldMapping,
        ...destinationMappingSettings
    }
    for (const [mappedKey, value] of Object.entries(fieldMapping)) {
        const mappingKey = value;
        if (mappingKey === 'settings.referenceStatus') {
            const statusKey = assignStatus(referenceStatus, statusSettings);
            mappedDataPoints[mappedKey] = statusKey;
        } else if (mappedKey.includes("[].")) {

            // Handle array keys (e.g., sales_invoice.invoice_lines[].description)
            const [parentKey, arrayKey] = mappedKey.split("[].");
            const parentKeys = parentKey.split(".");
            let currentParent = mappedDataPoints;
            for (const [idx, nestedKey] of parentKeys.entries()) {
                if (!currentParent[nestedKey]) {
                    currentParent[nestedKey] = idx === parentKeys.length - 1 ? [] : {};
                }
                currentParent = currentParent[nestedKey];
            }
            const sourceArray = getNestedValue(dataToSend, mappingKey.split("[].")[0]) || [];
            sourceArray.forEach((sourceItem, index) => {
                const mappedItem = currentParent[index] || {};
                for (const [innerKey, innerMapping] of Object.entries(fieldMapping)) {
                    if (innerKey.startsWith(`${parentKey}[].`)) {
                        const innerFieldKey = innerKey.split("[].")[1];
                        if (typeof innerMapping === "string" && !innerMapping.includes("[].")) {
                            // Static string value (e.g., 'GB_NO_TAX')
                            mappedItem[innerFieldKey] = innerMapping;
                        } else {
                            // Dynamic mapping from the source array
                            const mappedValue = getNestedValue(sourceItem, innerMapping.split("[].")[1]) || "";
                            mappedItem[innerFieldKey] = mappedValue;
                        }
                    }
                }
                currentParent[index] = mappedItem;
            });
        }
        else if (typeof mappingKey === "object" && !Array.isArray(mappingKey) && mappingKey !== null) {
            mappedDataPoints[mappedKey] = {};
            for (const [subKey, modelKey] of Object.entries(mappingKey)) {
                mappedDataPoints[mappedKey][subKey] = modelKey ? getNestedValue(dataToSend, modelKey) : "";
            }
        }
        else if (typeof mappingKey === "string") {
            const resolvedValue = getNestedValue(dataToSend, mappingKey);
            mappedDataPoints[mappedKey] = Object.values(destinationMappingSettings).includes(mappingKey)
                ? (resolvedValue || mappingKey)
                : resolvedValue;
        } else {
            // Default behavior for other types
            mappedDataPoints[mappedKey] = mappingKey;
        }
    }
    const nestedObject = await keysToNestedObjectWithArrays(mappedDataPoints);
    return JSON.stringify(nestedObject, null, 2);
}

async function keysToNestedObjectWithArrays(mappedDataPoints) {
    const nestedObject = {};
    // console.log('mappedDataPoints:===', mappedDataPoints);

    for (const [key, value] of Object.entries(mappedDataPoints)) {
        const keys = key.split('.'); // Split the key into parts
        let current = nestedObject;
        if (key.includes('[') && key.includes(']')) {
            const arrayKey = key.split('[')[0]; // Get the array key
            const arrayField = key.split('[')[1].split(']')[0]; // Get the field inside []

            current[arrayKey] = current[arrayKey] || {}; // Initialize if doesn't exist
            current[arrayKey][`[${arrayField}]`] = value; // Add the value under the key
        } else {
            keys.forEach((part, index) => {
                if (index === keys.length - 1) {
                    // Last part, assign the value
                    if (Array.isArray(value)) {
                        current[part] = value.slice(); // Copy array
                    } else if (typeof value === 'object' && value !== null) {
                        current[part] = { ...current[part], ...value }; // Merge objects
                    } else {
                        current[part] = value; // Assign primitive value
                    }
                } else {
                    // Traverse deeper, initialize objects or arrays as needed
                    if (!current[part] || typeof current[part] !== 'object') {
                        current[part] = {}; // Initialize object
                    }
                    current = current[part];
                }
            });
        }
    }

    return nestedObject;
}


// Adjusted getNestedValue to handle array indices properly
const getNestedValue = (dataToSend, fieldMappingKey) => {
    if (!fieldMappingKey) return "";
    if (typeof fieldMappingKey !== "string") return "";

    return fieldMappingKey.split(".").reduce((currentValue, fieldMappingkey) => {
        const fieldMappingkeyMatch = fieldMappingkey.match(/(\w+)\[(\d+)\]/);
        if (fieldMappingkeyMatch) {

            const fieldMappingMatchKey = fieldMappingkeyMatch[1];
            const index = parseInt(fieldMappingkeyMatch[2], 10);
            return (
                currentValue &&
                currentValue[fieldMappingMatchKey] &&
                currentValue[fieldMappingMatchKey][index]
            );
        }
        return currentValue && currentValue[fieldMappingkey];
    }, dataToSend) || "";
};
module.exports = { destinationIntegrationOperationsServices }