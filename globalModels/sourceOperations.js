const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");
const integrationsSettingsModel = require("../models/integrationsSettingsModel");
const serviceProviderServicesModel = require("../models/serviceProviderServicesModel");
const { validateServiceProviders, validateSPAuthentication } = require("./serviceProviderAuthModel");
const { GlobalHTTPMethods } = require("./sourceAndDestinationSyncModel");
const moment = require('moment');

/**
 * 
 * @param {*} integrationObject holds field N X number of mapping records (Both source & destination)
 * 1. First, we are looping the integration mappings (N X number). 
 * 2. Authenticate & get required tokens
 * 3. Fetch source side data objects by calling API calls.  
 * 4. Insert into source side collections with new status and required data points. 
 */
const sourceIntegrationOperationsServices = async (integrationObject) => {
    for (const data of integrationObject) {
        // Process each integration data
        await processSIMappings(data);
    }
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

// Function to process services with dependencies
const processSIServiceCalls = async (services, integrationsMasterId, sourceProvider, authToken, integrationDetails, responseData = null) => {
    for (const serviceObject of services) {

        if (responseData)
            serviceObject.dependentData = responseData; // Attach dependent data
        
        // Process the current service and get its response
        const currentResponse = await processIntegrationService(serviceObject, integrationsMasterId, sourceProvider, authToken,integrationDetails);
        
        // If the current response has length > 1, recursively call for the next priority
        if (currentResponse?.WorkOrders !== undefined && currentResponse?.WorkOrders.length > 0) {
            const remainingServices = services.filter(s => s.priority > serviceObject.priority); // Get next priority services
            // console.log('Remaining Services for next call:', remainingServices);

            if (remainingServices.length > 0) {
                await processSIServiceCalls(
                    remainingServices,
                    integrationsMasterId,
                    sourceProvider,
                    authToken,
                    integrationDetails,
                    currentResponse.WorkOrders // Pass the current response as dependent data
                );
            }
        }
    }
};

// Function to process a single service
const processIntegrationService = async (serviceObject, integrationsMasterId, sourceProvider, authToken, integrationDetails) => {
    let responseData;
    switch (serviceObject.serviceMethod) {
        case 'post':
            const requestObject = await getRequestPayload(integrationsMasterId, sourceProvider, serviceObject.serviceProviderServiceId);
            console.log('POST Payload:', requestObject);
            responseData = await GlobalHTTPMethods.handlePost(serviceObject, authToken, requestObject, integrationDetails);
            break;

        case 'get':
            // Use dependent data for GET request if available
            console.log('Using dependent data for GET:', serviceObject);
            const urls = await modifyUrlsWithDependentData(serviceObject.dataPointUrl, serviceObject.primaryKeyColumn, serviceObject.dependentData);

            // Loop over each URL and get the detailed report
            for (const modifiedUrl of urls) {
                console.log('Making GET request to URL:', modifiedUrl);
                responseData = await GlobalHTTPMethods.handleGet(serviceObject, authToken, modifiedUrl, integrationDetails); // Passing modified URL for GET
            }
            break;

        default:
            console.warn(`Unsupported method: ${serviceObject.serviceMethod}`);
            break;
    }
    return responseData;
};

// Helper to modify the URL with dependent data (returns an array of URLs)
const modifyUrlsWithDependentData = (url, primaryKeyColumn, dependentData) => {
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

    const serviceProviderDetails = await integrationsMasterServiceProvidersModel.findOne({
        integrationsMasterId: integrationMasterId,
        serviceProvider: sourceServiceProvider,
    });

    if (!serviceProviderDetails || !serviceProviderDetails.credentials) {
        throw new Error('Service provider credentials not found.');
    }

    const authResponse = await validateSPAuthentication(serviceProviderDetails.credentials).then((validationResult) => {
        return validationResult.requestMethod === 'body'
            ? { Authorization: `Bearer ${validationResult.responseData.access_token}` }
            : validationResult.responseData;
    });

    return authResponse;
}


// Main function to get the service payload
async function getRequestPayload(integrationMasterId, sourceServiceProvider, serviceProviderServiceId) {
    const serviceDetails = await fetchServiceDetails(serviceProviderServiceId);
    const integrationSettings = await fetchIntegrationSettings(integrationMasterId);

    const parsedRequestObject = parseRequestObject(serviceDetails.requestObject);
    const dateRange = calculateDateRange(integrationSettings.dataDumpRange);

    const updatedPayload = updatePayloadWithMappings(parsedRequestObject, serviceDetails.dataMappingPath, dateRange);

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
    const fromDateFormatted = currentMoment.subtract(dateRangeInDays, 'days').startOf('day').format('YYYY-MM-DDTHH:mm:ss');
    const toDateFormatted = moment().endOf('day').format('YYYY-MM-DDTHH:mm:ss');

    return { fromDateFormatted, toDateFormatted };
}

// Update the payload with data mapping paths and date range
function updatePayloadWithMappings(parsedRequestObject, dataMappingPaths, dateRange) {
    dataMappingPaths.forEach((path, index) => {
        const normalizedPath = normalizePath(path);
        const targetObject = traverseToTarget(parsedRequestObject, normalizedPath);

        const finalKey = normalizedPath[normalizedPath.length - 1];
        if (targetObject && typeof targetObject === 'object' && finalKey in targetObject) {
            if (targetObject[finalKey] === 'date') {
                targetObject[finalKey] = index === 0 ? dateRange.fromDateFormatted : dateRange.toDateFormatted;
            }
        }
    });
    return parsedRequestObject;
}

// Normalize path to handle array-like notation
function normalizePath(path) {
    return path.replace(/\[([^\]]+)]/g, '.$1').split('.'); // Normalize and split into segments
}

// Traverse an object or array to the target location based on path segments
function traverseToTarget(object, pathSegments) {
    let target = object;

    for (let i = 0; i < pathSegments.length - 1; i++) {
        const segment = pathSegments[i];
        if (Array.isArray(target)) {
            const index = parseInt(segment, 10);
            if (isNaN(index) || index < 0 || index >= target.length) {
                throw new Error(`Invalid array index: ${segment}`);
            }
            target = target[index];
        } else if (typeof target === 'object' && segment in target) {
            target = target[segment];
        } else {
            throw new Error(`Invalid path: ${pathSegments.join('.')}`);
        }
    }
    return target;
}

module.exports = { sourceIntegrationOperationsServices }