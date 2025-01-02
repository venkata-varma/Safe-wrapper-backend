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
require("dotenv").config();

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

    for (const data of integrationObject) {
        // Process each integration data
        destinationSettingsData = await serviceProviderIntegrationsModel.findOne({ from: data.from, to: data.to }).lean();
        await processSIMappings(data);
    }
};
/**
 * 
 * @param {*} data holds {} 
 */
const processSIMappings = async (data) => {
    const authToken = await getServiceproviderAuthResponse(data.integrationsMasterId, data.to);
    let integrationDetails = data
    // Sort services by priority and process them one by one
    const sortedServices = data.destinationIntegrationServices.sort((a, b) => a.priority - b.priority);
    await processSIServiceCalls(sortedServices, data.integrationsMasterId, data.to, authToken, integrationDetails);
};


// Function to process services with dependencies
const processSIServiceCalls = async (services, integrationsMasterId, sourceProvider, authToken, integrationDetails, responseData = null) => {
    // Use a helper function to process a single service
    let requestObject
    let postResponses = []
    for (serviceObject of services) {
        if (serviceObject.serviceMethod === 'post') {
            // Fetch documents in parallel


            const sourceData = await getSourceRecords(integrationDetails, destinationSettingsData?.sourceDataBaseName, "initiated")
            if (sourceData.length > 0) {
                for (let data of sourceData) {
                    serviceObject.dataToSend = JSON.parse(data.responseObject); // Attach the data to the service object
                    serviceObject.referenceStatus = data.refWorkOrderStatus
                    requestObject = await getRequestPayload(integrationsMasterId, sourceProvider, serviceObject, integrationDetails);

                    let currentResponse = await processIntegrationService(
                        serviceObject,
                        integrationsMasterId,
                        sourceProvider,
                        authToken,
                        integrationDetails,
                        destinationSettingsData?.destinationDataBaseName,
                        requestObject
                    );
                    postResponses.push({ sourceRecord: data, currentResponse });
                    let dataMappingPathKey = serviceObject.dataMappingPath[0];
                    if (currentResponse[`${dataMappingPathKey}`] !== undefined && Array.isArray(currentResponse[`${dataMappingPathKey}`])) {
                        if (currentResponse[`${dataMappingPathKey}`]?.length > 0) {
                            await addRecordIntoDataBase(integrationDetails, serviceObject, destinationSettingsData?.destinationDataBaseName, currentResponse[`${dataMappingPathKey}`], sourceDataBaseName = destinationSettingsData.sourceDataBaseName, "completed")
                        }
                    }
                    else if (typeof currentResponse[`${dataMappingPathKey}`] === 'object') {
                        await addRecordIntoDataBase(integrationDetails, serviceObject, destinationSettingsData?.destinationDataBaseName, currentResponse[`${dataMappingPathKey}`], sourceDataBaseName = destinationSettingsData.sourceDataBaseName, "completed")
                    }
                }
            }
        }
        else if (serviceObject.serviceMethod === 'patch') {
            // Fetch documents in parallel
            const sourceData = await getSourceRecords(integrationDetails, destinationSettingsData?.sourceDataBaseName, "update-request")

            if (sourceData.length > 0) {
                // Process all documents in parallel
                const responses = await Promise.all(
                    sourceData.map(async data => {
                        serviceObject.dataToSend = JSON.parse(data.responseObject); // Attach the data to the service object

                        const customFieldMappingObject = await getCustomFieldMappingObject(integrationDetails.customFieldMapping, serviceObject.dataToSend)
                        serviceObject.referenceStatus = data.refWorkOrderStatus
                        const keys = Object.keys(customFieldMappingObject);
                        const workOrderNumberKey = customFieldMappingObject[keys[0]];
                        const workOrderNumberToSearch = customFieldMappingObject[keys[1]];
                        let destinationRecords = await getDestinationRecords(integrationDetails, destinationSettingsData?.destinationDataBaseName, workOrderNumberKey, workOrderNumberToSearch)

                        serviceObject.dependentData = JSON.parse(destinationRecords.responseObject)
                        requestObject = await getRequestPayload(integrationsMasterId, sourceProvider, serviceObject, integrationDetails);

                        let currentResponse = await processIntegrationService(
                            serviceObject,
                            integrationsMasterId,
                            sourceProvider,
                            authToken,
                            integrationDetails,
                            destinationSettingsData?.destinationDataBaseName,
                            requestObject
                        );
                        let dataMappingPathKey = serviceObject.dataMappingPath[0];
                        if (currentResponse[`${dataMappingPathKey}`] !== undefined && Array.isArray(currentResponse[`${dataMappingPathKey}`])) {
                            if (currentResponse[`${dataMappingPathKey}`]?.length > 0) {
                                await addRecordIntoDataBase(integrationDetails, serviceObject, destinationSettingsData?.destinationDataBaseName, currentResponse[`${dataMappingPathKey}`], "completed")
                            }
                        }
                        else if (typeof currentResponse[`${dataMappingPathKey}`] === 'object') {
                            await addRecordIntoDataBase(integrationDetails, serviceObject, destinationSettingsData?.destinationDataBaseName, currentResponse[`${dataMappingPathKey}`], "completed")
                        }
                    })
                );
            }
        }
        else if (serviceObject.serviceMethod === 'get') {
            // Use the stored currentResponse from POST
            if (postResponses.length > 0) {
                for (const { sourceRecord, currentResponse } of postResponses) {
                    const dataMappingPathKey = serviceObject.dataMappingPath[0];
                    if (currentResponse) {
                        const responseDataArray = Array.isArray(currentResponse[dataMappingPathKey])
                            ? currentResponse
                            : [currentResponse];
                        serviceObject.dependentData = currentResponse; // Attach POST response data to GET
                        const getResponse = await processIntegrationService(
                            serviceObject,
                            integrationsMasterId,
                            sourceProvider,
                            authToken,
                            integrationDetails,
                            destinationSettingsData.destinationDataBaseName
                        );
                    }
                }
            } else {
                console.error('No previous POST response data available for GET method.');
            }
        }
    }


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

async function getDestinationRecords(integrationDetails, database, workOrderNumberKey, workOrderNumberToSearch) {
    const destinationRecords = await mongoose.connection.db
        .collection(`${database}`)
        .find({
            integrationsMasterId: integrationDetails.integrationsMasterId,
            accountId: integrationDetails.accountId,
        });

    let matchedDocument = null;
    // Use `for await...of` to iterate over the destinationRecords and find the match
    for await (const doc of destinationRecords) {
        try {
            const parsedResponse = JSON.parse(doc.responseObject); // Parse the stringified responseObject
            if (parsedResponse[workOrderNumberKey] === workOrderNumberToSearch) {
                matchedDocument = doc;
                break;
            }
        } catch (error) {
            console.error("Error parsing responseObject:", error);
        }
    }
    return matchedDocument
}

const getCustomFieldMappingObject = async (customFieldMapping, dependentData) => {
    const prepareObject = Object.fromEntries(
        Object.entries(customFieldMapping).map(([key, mappingKey]) => [key, dependentData[mappingKey]])
    );
    return prepareObject;
};


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
    // console.log('Datasss:==',url, primaryKeyColumn, dependentData)
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
            const placeholder = `{{${key}}}`; // Placeholder format (e.g., {{workOrderId}})

            // Hardcode value for messageId, or replace with dependentData value for other keys
            let value;
            if (key === 'messageId') {
                value = 'f6b492c9-ee7d-4e1b-a9a8-29f50f0b6d3a'; // Hardcoded value for messageId
            } else {
                value = dataObject[key]; // Get value from dependentData for other keys
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

    const serviceProviderDetails = await integrationsMasterServiceProvidersModel.findOne({
        integrationsMasterId: integrationMasterId,
        serviceProvider: sourceServiceProvider,
    });

    if (!serviceProviderDetails || !serviceProviderDetails.credentials) {
        throw new Error('Service provider credentials not found.');
    }

    const authResponse = await validateSPAuthentication(serviceProviderDetails.credentials).then((validationResult) => {
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
                // console.log('key:==',key)
                // console.log('result:==',result)

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
    console.log('statusValue:===', statusValue);

    // Use Object.entries and find the key where value matches
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
        } else if (typeof value === 'object' && !Array.isArray(value)) {
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
    // console.log('mappedDataPoints2:==', fieldMappingObject);

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