/**
 * 1. This script developed by Chandu Sai on 15th Dec - 2024.
 * STEP-1  
 */

const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");
const integrationsSettingsModel = require("../models/integrationsSettingsModel");
const serviceProviderIntegrationsModel = require("../models/serviceProviderIntegrationsModel");
const serviceProviderList = require("../models/serviceProviderList");
const serviceProviderServicesModel = require("../models/serviceProviderServicesModel");
const { addRecordIntoDataBase } = require("./dataBaseOperations");
const { validateServiceProviders, validateSPAuthentication } = require("./serviceProviderAuthModel");
const { GlobalHTTPMethods } = require("./sourceAndDestinationSyncModel");
const moment = require('moment');
var sourceSettingsData

let startTestResponseObject = {
    sourceAuthenticationStatus: false,
    destinationAuthenticationStatus: false,
    sourcePullCount: 0,
    destinationPullCount: 0,
}

/**
 * 
 * @param {*} integrationObject holds field N X number of mapping records (Both source & destination)
 * 1. First, we are looping the integration mappings (N X number). 
 * 2. Authenticate & get required tokens
 * 3. Fetch source side data objects by calling API calls.  
 * 4. Insert into source side collections with new status and required data points. 
 */
const sourceIntegrationOperationsServices = async (integrationObject) => {
    startTestResponseObject = {
        sourceAuthenticationStatus: false,
        destinationAuthenticationStatus: false,
        sourcePullCount: 0,
        destinationPullCount: 0,
    }
    for (const data of integrationObject) {
        sourceSettingsData = await serviceProviderIntegrationsModel.findOne({ from: data.from, to: data.to }).lean()
        await processSIMappings(data);
    }
    return startTestResponseObject
};
/**
 * 
 * @param {*} data holds {} 
 */
const processSIMappings = async (data) => {
    const authToken = await getServiceproviderAuthResponse(data.integrationsMasterId, data.from);
    let integrationDetails = data
    // Sort services by priority and process them one by one
    const sortedServices = data.sourceIntegrationServices.sort((a, b) => a.priority - b.priority);
    await processSIServiceCalls(sortedServices, data.integrationsMasterId, data.from, authToken, integrationDetails);
};

const processSIServiceCalls = async (services, integrationsMasterId, sourceProvider, authToken, integrationDetails, responseData = null) => {
    // Store POST response data that will be used in GET requests
    let postResponseData = null;

    for (const serviceObject of services) {

        // Attach dependent data to the service object (only the first time or as needed)
        if (responseData) {
            serviceObject.dependentData = responseData; // Attach dependent data to the service object
        }

        let dataMappingPathKey = serviceObject?.dataMappingPath[0]
        let primaryKeyColumn = serviceObject?.primaryKeyColumn[0]
        if (serviceObject.serviceMethod === 'post') {
            const requestObject = await getRequestPayload(integrationsMasterId, sourceProvider, serviceObject.serviceProviderServiceId, integrationDetails);
            console.log('requestObject:==', requestObject)
            const currentResponse = await processIntegrationService(
                serviceObject,
                integrationsMasterId,
                sourceProvider,
                authToken,
                integrationDetails,
                sourceSettingsData,
                requestObject
            );

            // Store the POST response data for the next GET requests
            postResponseData = currentResponse;
        }
        // If the service is GET, we need to use the response data from the POST service
        console.log('dataMappingPathKey:===', dataMappingPathKey)
        if (serviceObject.serviceMethod === 'get' && postResponseData[`${dataMappingPathKey}`].length > 0) {
            for (let data of postResponseData[`${dataMappingPathKey}`]) {
                serviceObject.dependentData = data
                const currentResponse = await processIntegrationService(
                    serviceObject,
                    integrationsMasterId,
                    sourceProvider,
                    authToken,
                    integrationDetails,
                    sourceSettingsData
                );

                const responseData = currentResponse[`${dataMappingPathKey}`]
                const recordToInsert = Array.isArray(responseData) ? responseData[0] : responseData;
                startTestResponseObject.sourcePullCount++
                await preProcessSourceSet(integrationDetails, serviceObject, dataMappingPathKey, primaryKeyColumn, sourceSettingsData?.settings?.metrics?.sourceDataBaseName, recordToInsert, sourceSettingsData?.settings?.metrics?.destinationDataBaseName, "source", recordToInsert[`${primaryKeyColumn}`])
            }

        }
    }
};
const preProcessSourceSet = async (integrationDetails, services, dataMappingPathKey, primaryKeyColumn, insertingDataBaseName, currentResponse, updatingDataBaseName, operationType, sourceReferenceId) => {

    if (currentResponse !== undefined && currentResponse[`${dataMappingPathKey}`] !== undefined && Array.isArray(currentResponse[`${dataMappingPathKey}`])) {
        if (currentResponse[`${dataMappingPathKey}`]?.length > 0) {
            await addRecordIntoDataBase(integrationDetails, services, dataMappingPathKey, primaryKeyColumn, insertingDataBaseName, currentResponse[`${dataMappingPathKey}`], updatingDataBaseName, "initiated", operationType, sourceReferenceId)
        }
    }
    else if (currentResponse !== undefined && typeof currentResponse === 'object') {
        await addRecordIntoDataBase(integrationDetails, services, dataMappingPathKey, primaryKeyColumn, insertingDataBaseName, currentResponse, updatingDataBaseName, "initiated", operationType, sourceReferenceId)
    }
}

// Function to process a single service
const processIntegrationService = async (serviceObject, integrationsMasterId, sourceProvider, authToken, integrationDetails, sourceSettingsData, requestObject) => {
    let responseData;
    switch (serviceObject.serviceMethod) {
        case 'post':
            responseData = await GlobalHTTPMethods.handlePost(serviceObject, authToken, requestObject, integrationDetails, sourceSettingsData);
            break;

        case 'get':
            // Use dependent data for GET request if available
            const urls = await modifyUrlsWithDependentData(serviceObject.dataPointUrl, serviceObject.primaryKeyColumn, serviceObject.dependentData);
            responseData = await GlobalHTTPMethods.handleGet(serviceObject, authToken, urls[0], integrationDetails, sourceSettingsData);
            break;

        default:
            console.warn(`Unsupported method: ${serviceObject.serviceMethod}`);
            break;
    }
    return responseData;
};


// Helper to modify the URL with dependent data (returns an array of URLs)
const modifyUrlsWithDependentData = async (url, primaryKeyColumn, dependentDataObject) => {
    let dependentData = Array.isArray(dependentDataObject)
        ? [...dependentDataObject]
        : [dependentDataObject];


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

        // console.log('Modified URL for work order:', modifiedUrl); // Debugging output for modified URL
        urls.push(modifiedUrl); // Push the generated URL to the array
    });
    return urls; // Return the array of modified URLs
};

// Function to retrieve the authentication response for the integration service
/**
 * 
 * @param {*} integrationMasterId 
 * @param {*} sourceServiceProvider
 * 1. Fetch service provider authentication credentials 
 * 2. Validate service provider authentication credentils
 * 3. Find response & find data path.
 * @returns required authentication credentials say {token, refresh token & others}
 */

async function getServiceproviderAuthResponse(integrationMasterId, sourceServiceProvider) {
    console.log('integrationMasterId:', integrationMasterId, sourceServiceProvider);

    let serviceProviderDetails = await integrationsMasterServiceProvidersModel.findOne({
        integrationsMasterId: integrationMasterId,
        serviceProvider: sourceServiceProvider,
    }).lean();

    if (!serviceProviderDetails || !serviceProviderDetails.credentials) {
        serviceProviderDetails = await serviceProviderList.findOne({ serviceProviders: sourceServiceProvider })
        // throw new Error('Service provider credentials not found.');
    }
    const authResponse = await validateSPAuthentication(serviceProviderDetails.credentials || serviceProviderDetails?.testCredentials).then((validationResult) => {
        startTestResponseObject.sourceAuthenticationStatus = validationResult.status
        return validationResult.requestMethod === 'body'
            ? { Authorization: `Bearer ${validationResult.responseData[`${serviceProviderDetails.dataMappingPath[0]}`]}`, 'Content-Type': 'application/json' }
            : validationResult.responseData;
    });

    return authResponse;
}


// Main function to get the service payload
async function getRequestPayload(integrationMasterId, sourceServiceProvider, serviceProviderServiceId, integrationDetails) {
    const serviceDetails = await fetchServiceDetails(serviceProviderServiceId);
    const integrationSettings = await fetchIntegrationSettings(integrationMasterId);

    const parsedRequestObject = parseRequestObject(serviceDetails.requestObject);
    const dateRange = calculateDateRange(integrationSettings.dataDumpRange);
    const updatedPayload = updatePayloadWithMappings(parsedRequestObject, sourceSettingsData?.settings?.sourceSettings, dateRange);

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
    let integrationSettings = await integrationsSettingsModel.findOne({ integrationsMasterId });
    if (!integrationSettings) {
        integrationSettings = { dataDumpRange: 28 }
        // throw new Error('Integration settings not found.');
    }
    return integrationSettings;
}

// Parse the request object and ensure it's valid
function parseRequestObject(requestObject) {
    const parsedRequestObject = JSON.parse(requestObject);
    if (typeof parsedRequestObject !== 'object' || parsedRequestObject === null) {
        throw new Error('Invalid parsedRequestObject: Expected an object or array.');
    }
    return parsedRequestObject;
}

// Calculate date range based on a given range in days
function calculateDateRange(dateRangeInDays) {
    const currentMoment = moment();
    const fromDateFormatted = currentMoment.subtract(dateRangeInDays, 'days').startOf('day').
        format('YYYY-MM-DDTHH:mm:ss');
    const toDateFormatted = moment().endOf('day').format('YYYY-MM-DDTHH:mm:ss');

    return { fromDateFormatted, toDateFormatted };
}

function updatePayloadWithMappings(parsedRequestObject, dataMappingPaths, dateRange) {
    let dateIndex = 0; // Counter to track which date (from or to) to assign

    // Iterate over each entry in the dataMappingPaths
    Object.entries(dataMappingPaths).forEach(([key, path]) => {
        if (path === "date") {
            const normalizedPath = normalizePath(key); // Normalize the key to a path array
            const parentPath = normalizedPath.slice(0, -1); // Extract the parent path (all except final key)
            const finalKey = normalizedPath[normalizedPath.length - 1]; // Extract the final key (e.g., 'From' or 'To')

            // Use traverseToTarget to get the parent object
            const targetObject = traverseToTarget(parsedRequestObject, parentPath);

            // Check if targetObject exists and the finalKey is found directly on targetObject
            if (targetObject && finalKey in targetObject) {
                console.log(`Key '${finalKey}' found in targetObject. Assigning value...`);
                targetObject[finalKey] = dateIndex === 0
                    ? dateRange.fromDateFormatted
                    : dateRange.toDateFormatted;

                // Increment dateIndex to toggle between fromDate and toDate
                dateIndex++;
            } else {
                console.warn(`Failed to find or update key '${finalKey}' in targetObject:`, targetObject);
            }
        }
    });

    return parsedRequestObject;
}

// Normalize path to handle array-like notation (e.g., "Parameters[0].Created.From" => ["Parameters", "0", "Created", "From"])
function normalizePath(path) {
    return path.replace(/\[([^\]]+)]/g, '.$1').split('.'); // Normalize and split into segments
}

// Traverse an object or array to the target location based on path segments
function traverseToTarget(object, pathSegments) {
    let target = object;

    // Iterate through each path segment, except for the final one
    for (let i = 0; i < pathSegments.length; i++) {
        const segment = pathSegments[i];

        // Check if the target is an array and use the index
        if (Array.isArray(target)) {
            const index = parseInt(segment, 10);
            if (isNaN(index) || index < 0 || index >= target.length) {
                console.error(`Invalid array index: ${segment}`);
                return null;
            }
            target = target[index]; // Update target to the item at the specified index
        } else if (typeof target === 'object' && segment in target) {
            target = target[segment]; // Update target to the next level in the object
        } else {
            console.error(`Invalid path segment: ${segment} in path ${pathSegments.join('.')}`);
            return null; // If the path is invalid, return null
        }
    }

    return target; // Return the final object in the path
}




module.exports = { sourceIntegrationOperationsServices }