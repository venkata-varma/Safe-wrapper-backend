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
    let integrationDetails = data
    const sortedServices = data.destinationIntegrationServices.sort((a, b) => a.priority - b.priority);
    await processSIServiceCalls(sortedServices, data.integrationsMasterId, data.to, authToken, integrationDetails);
};

const preProcessDestinationSet = async (integrationDetails, services, dataMappingPathKey, primaryKeyColumn, destinationDataBaseName, currentResponse, sourceDataBaseName, operationType, sourceReferenceId) => {

    if (currentResponse !== undefined && currentResponse[`${dataMappingPathKey}`] !== undefined && Array.isArray(currentResponse[`${dataMappingPathKey}`])) {
        if (currentResponse[`${dataMappingPathKey}`]?.length > 0) {
            await addRecordIntoDataBase(integrationDetails, services, dataMappingPathKey, primaryKeyColumn, destinationDataBaseName, currentResponse[`${dataMappingPathKey}`], sourceDataBaseName, "completed", operationType, sourceReferenceId)
        }
    }
    else if (currentResponse !== undefined && typeof currentResponse[`${dataMappingPathKey}`] === 'object') {
        await addRecordIntoDataBase(integrationDetails, services, dataMappingPathKey, primaryKeyColumn, destinationDataBaseName, currentResponse[`${dataMappingPathKey}`], sourceDataBaseName, "completed", operationType, sourceReferenceId)
    }
}

const processIndividualGetOperations = async (integrationDetails, integrationsMasterId, sourceProvider, authToken, serviceObject, dataMappingPathKey, primaryKeyColumn, destinationDataBaseName, postResponses, sourceDataBaseName) => {
    for (let { sourceRecord, currentResponse, sourceReferenceId } of postResponses) {
        let responseToSend = currentResponse
        if (responseToSend) {
            const responseDataArray = Array.isArray(responseToSend)
                ? responseToSend
                : [responseToSend];
            serviceObject.dependentData = responseDataArray; // Attach POST response data to GET
            const getCurrentResponse = await processIntegrationService(
                serviceObject,
                integrationsMasterId,
                sourceProvider,
                authToken,
                integrationDetails,
                destinationSettingsData.destinationDataBaseName
            );
            startTestResponseObject.destinationPushCount++
            await preProcessDestinationSet(integrationDetails, serviceObject, dataMappingPathKey, primaryKeyColumn, destinationDataBaseName, getCurrentResponse, sourceDataBaseName, "destination", sourceReferenceId)
        }
    }
}

const submitSourceWorkOrdersToDestination = async (services, integrationsMasterId, sourceProvider, authToken, integrationDetails) => {
    const numberOfAPICalls = services.length
    let postResponses = []
    let requestObject
    if (numberOfAPICalls === 1) {
        if (services[0].serviceMethod === 'post') {
            let dataMappingPathKey = services[0].dataMappingPath[0]
            let primaryKeyColumn = services[0].primaryKeyColumn[0]
            const sourceData = await getSourceRecords(integrationDetails, destinationSettingsData?.settings?.metrics?.sourceDataBaseName, "initiated")
            if (sourceData.length > 0) {
                for (let data of sourceData) {

                    services.dataToSend = JSON.parse(data.responseObject);
                    services.referenceStatus = data.referenceStatus
                    requestObject = await getRequestPayload(integrationsMasterId, sourceProvider, services, integrationDetails);
                    // console.log('requestObject:===',requestObject)
                    let currentResponse = await processIntegrationService(
                        services[0],
                        integrationsMasterId,
                        sourceProvider,
                        authToken,
                        integrationDetails,
                        destinationSettingsData?.settings?.metrics?.destinationDataBaseName,
                        requestObject
                    );
                    startTestResponseObject.destinationPushCount++
                    await preProcessDestinationSet(integrationDetails, services, dataMappingPathKey, primaryKeyColumn, destinationSettingsData?.settings?.metrics?.destinationDataBaseName, currentResponse, sourceDataBaseName = destinationSettingsData?.settings?.metrics?.sourceDataBaseName, "destination", data.sourceReferenceId)

                }
            }
        }
        else if (services[0].serviceMethod === 'patch') {

            const sourceData = await getSourceRecords(integrationDetails, destinationSettingsData?.settings?.metrics?.sourceDataBaseName, "update-request")
            let dataMappingPathKey = services[0].dataMappingPath[0]
            let primaryKeyColumn = services[0].primaryKeyColumn[0]
            if (sourceData.length > 0) {
                for (let data of sourceData) {
                    services.dataToSend = JSON.parse(data.responseObject);
                    services.referenceStatus = data.referenceStatus

                    let destinationRecords = await getDestinationRecords(integrationDetails, destinationSettingsData?.settings?.metrics?.destinationDataBaseName, data?.sourceReferenceId)

                    services[0].dependentData = JSON.parse(destinationRecords.responseObject)
                    requestObject = await getRequestPayload(integrationsMasterId, sourceProvider, services, integrationDetails);
                    // console.log('requestObject:===', requestObject)

                    let currentResponse = await processIntegrationService(
                        services[0],
                        integrationsMasterId,
                        sourceProvider,
                        authToken,
                        integrationDetails,
                        destinationSettingsData?.settings?.metrics?.destinationDataBaseName,
                        requestObject
                    );
                    // postResponses.push({ sourceRecord: data, currentResponse });
                    await preProcessDestinationSet(integrationDetails, services, dataMappingPathKey, primaryKeyColumn, destinationSettingsData?.settings?.metrics?.destinationDataBaseName, currentResponse, sourceDataBaseName = destinationSettingsData?.settings?.metrics?.sourceDataBaseName, "destination", data.sourceReferenceId)

                }
            }
        }
    }

    else if (numberOfAPICalls > 1) {
        for (let serviceObject of services) {
            let dataMappingPathKey = serviceObject.dataMappingPath[0]
            let primaryKeyColumn = serviceObject.primaryKeyColumn[0]
            if (serviceObject.serviceMethod === 'post') {
                const sourceData = await getSourceRecords(integrationDetails, destinationSettingsData?.settings?.metrics?.sourceDataBaseName, "initiated")

                if (sourceData.length > 0) {
                    for (let data of sourceData) {
                        services.dataToSend = JSON.parse(data.responseObject);
                        services.referenceStatus = data.referenceStatus
                        requestObject = await getRequestPayload(integrationsMasterId, sourceProvider, services, integrationDetails);
                        // console.log('requestObject:===',requestObject)
                        let currentResponse = await processIntegrationService(
                            serviceObject,
                            integrationsMasterId,
                            sourceProvider,
                            authToken,
                            integrationDetails,
                            destinationSettingsData?.settings?.metrics?.destinationDataBaseName,
                            requestObject
                        );
                        postResponses.push({ sourceRecord: data, currentResponse, sourceReferenceId: data.sourceReferenceId });
                        // await preProcessDestinationSet(integrationDetails, serviceObject,dataMappingPathKey,primaryKeyColumn, destinationSettingsData?.destinationDataBaseName, currentResponse, sourceDataBaseName = destinationSettingsData.sourceDataBaseName)

                    }
                }
            }
            else if (serviceObject.serviceMethod === 'patch') {

                const sourceData = await getSourceRecords(integrationDetails, destinationSettingsData?.settings?.metrics?.sourceDataBaseName, "update-request")

                if (sourceData.length > 0) {
                    for (let data of sourceData) {
                        serviceObject.dataToSend = JSON.parse(data.responseObject);
                        serviceObject.referenceStatus = data.referenceStatus
                        let destinationRecords = await getDestinationRecords(integrationDetails, destinationSettingsData?.settings?.metrics?.destinationDataBaseName, data?.sourceReferenceId)

                        serviceObject.dependentData = JSON.parse(destinationRecords.responseObject)
                        requestObject = await getRequestPayload(integrationsMasterId, sourceProvider, serviceObject, integrationDetails);

                        let currentResponse = await processIntegrationService(
                            serviceObject,
                            integrationsMasterId,
                            sourceProvider,
                            authToken,
                            integrationDetails,
                            destinationSettingsData?.settings?.metrics?.destinationDataBaseName,
                            requestObject
                        );
                        postResponses.push({ sourceRecord: data, currentResponse, sourceReferenceId: data.sourceReferenceId });
                    }
                }
            }
            else if (serviceObject.serviceMethod === 'get') {
                if (postResponses.length > 0) {
                    await processIndividualGetOperations(integrationDetails, integrationsMasterId, sourceProvider, authToken, serviceObject, dataMappingPathKey, primaryKeyColumn, destinationSettingsData?.settings?.metrics?.destinationDataBaseName, postResponses, sourceDataBaseName = destinationSettingsData?.settings?.metrics?.sourceDataBaseName)
                }
            }

        }

    }
}

// Function to process services with dependencies
const processSIServiceCalls = async (services, integrationsMasterId, sourceProvider, authToken, integrationDetails, responseData = null) => {

    let submitWorkOrders = await submitSourceWorkOrdersToDestination(services, integrationsMasterId, sourceProvider, authToken, integrationDetails)
};

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

    let serviceProviderDetails = await integrationsMasterServiceProvidersModel.findOne({
        integrationsMasterId: integrationMasterId,
        serviceProvider: sourceServiceProvider,
    });

    if (!serviceProviderDetails || !serviceProviderDetails.credentials) {
        serviceProviderDetails = await serviceProviderList.findOne({ serviceProviders: sourceServiceProvider })
        // throw new Error('Service provider credentials not found.');
    }

    const authResponse = await validateSPAuthentication(serviceProviderDetails.credentials || serviceProviderDetails.testCredentials).then((validationResult) => {
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

async function getNestedValue(dataToMap, mappingKey) {
    // Ensure dataToMap is an object before proceeding
    if (dataToMap === null || dataToMap === undefined) {
        return undefined; // Return undefined if dataToMap is null or undefined
    }
    // console.log('mappingKey:==',mappingKey)
    if (typeof mappingKey !== 'string') {
        return mappingKey;
    }
    const keys = mappingKey.split('.'); // Split the mappingKey into keys
    let result = dataToMap;
    for (const key of keys) {
        if (result && typeof result === 'object') {
            // Check for array access (e.g., WorkDetails.Assets[0].Comment)
            const arrayMatch = key.match(/^(.+)\[(\d+)]$/);
            if (arrayMatch) {
                const arrayKey = arrayMatch[1];
                const index = parseInt(arrayMatch[2], 10);
                if (Array.isArray(result[arrayKey]) && result[arrayKey][index] !== undefined) {
                    result = result[arrayKey][index];
                } else {
                    return undefined;
                }
            } else if (key in result) {
                result = result[key]; // Access the next level in the object
            }
            else {
                return undefined;
            }
        } else {
            return undefined; // Return undefined if key doesn't exist
        }
    }
    return result;
}

function assignStatus(statusValue, statusSettings) {
    let statusKey = Object.entries(statusSettings).find(([key, value]) => value === statusValue);

    if (statusKey)
        return statusKey[0];
    else
        return statusValue;

}

async function updatePayloadWithMappings(mappedDataPoints, destinationMappingSettings, dataToSend, statusSettings, referenceStatus) {
    if (dataToSend === null || dataToSend === undefined) {
        console.error('The provided dataToSend object is null or undefined');
        return mappedDataPoints;
    }
    // console.log('dataToSend:==',dataToSend)
    let fieldMappingObject = {}
    for (const [mappedKey, value] of Object.entries(mappedDataPoints)) {
        if (value === 'settings.referenceStatus') {
            const statusKey = assignStatus(referenceStatus, statusSettings);
            fieldMappingObject[mappedKey] = statusKey;
        } else if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
            console.log('Object:===', value)
            for (const subKey of Object.keys(value)) {
                const subKeyPath = `${mappedKey}.${subKey}`;
                const nestedValue = await getNestedValue(dataToSend, subKeyPath);
                if (nestedValue !== undefined) {
                    fieldMappingObject[mappedKey] = fieldMappingObject[mappedKey] || {};
                    fieldMappingObject[mappedKey][subKey] = nestedValue;
                }
            }
        } else {
            const valueFromDataToSend = await getNestedValue(dataToSend, value);
            if (valueFromDataToSend !== undefined) {
                fieldMappingObject[mappedKey] = valueFromDataToSend;
            }
        }
    }
    mappedDataPoints = Object.assign(fieldMappingObject, destinationMappingSettings);

    const nestedObject = await keysToNestedObjectWithArrays(fieldMappingObject);
    return JSON.stringify(nestedObject, null, 2);
}


async function keysToNestedObjectWithArrays(mappedDataPoints) {
    const nestedObject = {};

    for (const [key, value] of Object.entries(mappedDataPoints)) {
        const keys = key.split('.'); // Split the key into parts
        let current = nestedObject;

        // Handle case for array keys (like userDefinedFields[...])
        if (key.includes('[') && key.includes(']')) {
            const arrayKey = key.split('[')[0]; // Get the array key
            const arrayField = key.split('[')[1].split(']')[0]; // Get the field inside []

            current[arrayKey] = current[arrayKey] || {}; // Initialize if doesn't exist
            current[arrayKey][`[${arrayField}]`] = value; // Add the value under the key
        } else {
            // If it's not an array, continue as usual
            keys.forEach((part, index) => {
                if (index === keys.length - 1) {
                    // Last part, assign the value
                    if (Array.isArray(value)) {
                        current[part] = value.slice(); // Copy array
                    } else if (typeof value === 'object' && value !== null) {
                        current[part] = { ...value }; // Clone object
                    } else {
                        current[part] = value; // Assign primitive value
                    }
                } else {
                    // Not last, traverse deeper
                    current[part] = current[part] || {}; // Initialize object if not exists
                    current = current[part];
                }
            });
        }
    }

    return nestedObject;
}
module.exports = { destinationIntegrationOperationsServices }