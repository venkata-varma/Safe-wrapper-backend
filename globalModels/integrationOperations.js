const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");
const integrationsSettingsModel = require("../models/integrationsSettingsModel");
const serviceProviderServicesModel = require("../models/serviceProviderServicesModel");
const { validateServiceProviders } = require("./serviceProviderAuthModel");
const { GlobalHTTPMethods } = require("./sourceAndDestinationSyncModel");
const moment = require('moment');

// Main function to handle integration operations for each service in the integrationObject
const integrationOperationsServices = async (integrationObject) => {
    for (const data of integrationObject) {
        // Process each integration data
        await processIntegrationData(data);
    }
};

// Function to process a single integration's data
const processIntegrationData = async (data) => {
    // Fetch the authentication token for the source service provider
    const authToken = await getIntegrationAuthResponse(data.integrationsMasterId, data.from);

    // Process each service in sourceIntegrationServices
    for (const item of data.sourceIntegrationServices) {
        await processIntegrationService(item, data.integrationsMasterId, data.from, authToken);
    }
};

// Function to process a single service
const processIntegrationService = async (service, integrationsMasterId, sourceProvider, authToken) => {
    switch (service.serviceMethod) {
        case 'post':
            // Generate payload for the POST request
            const servicePayload = await getServicePayload(integrationsMasterId, sourceProvider, service.serviceProviderServiceId);
            console.log('servicePayload:==', servicePayload);

            // Perform the POST request
            await GlobalHTTPMethods.handlePost(service, authToken, servicePayload);
            break;

        // Uncomment and implement GET or other methods if needed
        // case 'get':
        //     console.log('service.serviceMethod:==', service.serviceMethod);
        //     await GlobalHTTPMethods.handleGet(service, authToken);
        default:
            console.warn(`Unsupported service method: ${service.serviceMethod}`);
            break;
    }
};

// Function to retrieve the authentication response for the integration service
async function getIntegrationAuthResponse(integrationMasterId, sourceServiceProvider) {
    console.log('integrationMasterId:---', integrationMasterId, sourceServiceProvider);

    // Fetch the service provider details based on the integrationMasterId and source service provider
    const serviceProviderDetails = await integrationsMasterServiceProvidersModel.findOne({
        integrationsMasterId: integrationMasterId,
        serviceProvider: sourceServiceProvider,
    });

    // If no credentials are found for the service provider, throw an error
    if (!serviceProviderDetails || !serviceProviderDetails.credentials) {
        throw new Error('Service provider credentials not found.');
    }

    // Validate the credentials and fetch the authentication response
    const authResponse = await validateServiceProviders(serviceProviderDetails.credentials)
        .then((validationResult) => {
            // Depending on the validation result, return the authorization header or the raw response data
            return validationResult.requestMethod === 'body'
                ? { Authorization: `Bearer ${validationResult.responseData.access_token}` }
                : validationResult.responseData;
        });

    // Return the authResponse (either token or raw response)
    return authResponse;
}

// Main function to get the service payload
async function getServicePayload(integrationMasterId, sourceServiceProvider, serviceProviderServiceId) {
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

module.exports = { integrationOperationsServices }