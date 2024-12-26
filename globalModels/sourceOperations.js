const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");
const integrationsSettingsModel = require("../models/integrationsSettingsModel");
const serviceProviderIntegrationsModel = require("../models/serviceProviderIntegrationsModel");
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
            // console.log('responseData:===',responseData)
            serviceObject.dependentData = responseData; // Attach dependent data

        // Process the current service and get its response
        const currentResponse = await processIntegrationService(serviceObject, integrationsMasterId, sourceProvider, authToken, integrationDetails);

        let dataMappingPathKey = serviceObject.dataMappingPath[0]
        // console.log('currentResponse[`${dataMappingPathKey}`]:===',currentResponse[`${dataMappingPathKey}`])
        // If the current response has length > 1, recursively call for the next priority
        if (currentResponse[`${dataMappingPathKey}`] !== undefined && currentResponse[`${dataMappingPathKey}`].length > 0) {
            const remainingServices = services.filter(s => s.priority > serviceObject.priority); // Get next priority services
            // console.log('Remaining Services for next call:', remainingServices);
            console.log('currentResponse[`${dataMappingPathKey}`]:===',)

            if (remainingServices.length > 0) {
                await processSIServiceCalls(
                    remainingServices,
                    integrationsMasterId,
                    sourceProvider,
                    authToken,
                    integrationDetails,
                    currentResponse[`${dataMappingPathKey}`] // Pass the current response as dependent data
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
            const requestObject = await getRequestPayload(integrationsMasterId, sourceProvider, serviceObject.serviceProviderServiceId, integrationDetails);
            console.log('POST Payload:', requestObject);
            responseData = await GlobalHTTPMethods.handlePost(serviceObject, authToken, requestObject, integrationDetails);
            break;

        case 'get':
            // Use dependent data for GET request if available
            // console.log('Using dependent data for GET:', serviceObject);
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
        // console.error('Invalid dependent data, returning original URL.');
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
async function getRequestPayload(integrationMasterId, sourceServiceProvider, serviceProviderServiceId, integrationDetails) {
    const serviceDetails = await fetchServiceDetails(serviceProviderServiceId);
    const integrationSettings = await fetchIntegrationSettings(integrationMasterId);

    const parsedRequestObject = parseRequestObject(serviceDetails.requestObject);
    const dateRange = calculateDateRange(integrationSettings.dataDumpRange);

    const sourceSettingsData = await serviceProviderIntegrationsModel.findOne({ from: integrationDetails.from, to: integrationDetails.to })
    // console.log('sourceSettingsData:===',sourceSettingsData)
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