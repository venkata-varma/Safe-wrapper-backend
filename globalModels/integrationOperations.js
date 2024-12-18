const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");
const integrationsSettingsModel = require("../models/integrationsSettingsModel");
const serviceProviderServicesModel = require("../models/serviceProviderServicesModel");
const { validateServiceProviders } = require("./serviceProviderAuthModel");
const { GlobalHTTPMethods } = require("./sourceAndDestinationSyncModel");
const moment = require('moment');



// Main function to handle integration operations for each service in the integrationObject
const integrationOperationsServices = async (integrationObject) => {
    // Loop through each item in the integrationObject
    const sourceIntegrationServices = integrationObject.forEach(async (data) => {
        // Fetch the authentication token for the source service provider using the integrationMasterId and 'from' provider
        const authToken = await getIntegrationAuthResponse(data.integrationsMasterId, data.from);
        data.sourceIntegrationServices.forEach(async (item) => {    // Loop through the sourceIntegrationServices array to perform service-specific actions
            switch (item.serviceMethod) {   
                case 'post':
                    const servicepayload = await getServicePayload(data.integrationsMasterId, integrationObject.from, item.serviceProviderServiceId);
                    console.log('servicepayload:==', servicepayload);
                    await GlobalHTTPMethods.handlePost(item, authToken, servicepayload);
                    break;
                // case 'get':
                //     console.log('item.serviceMethod:==', item.serviceMethod);
                //     await GlobalHTTPMethods.handleGet(data.sourceIntegrationServices, authToken);
                default:
                    break;
            }
        });
    });
}


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

async function getServicePayload(integrationMasterId, sourceServiceProvider, serviceProviderServiceId) {
    // Fetch service provider service details
    const serviceDetails = await serviceProviderServicesModel.findById(serviceProviderServiceId);
    const parsedRequestObject = JSON.parse(serviceDetails.requestObject); // Parse request object
    const dataMappingPaths = serviceDetails.dataMappingPath;

    // Ensure parsedRequestObject is an object or array
    if (typeof parsedRequestObject !== 'object' || parsedRequestObject === null) {
        throw new Error('Invalid parsedRequestObject: Expected an object or array.');
    }

    // Fetch integration settings details
    const integrationSettings = await integrationsSettingsModel.findOne({ integrationsMasterId: integrationMasterId });
    const dateRangeInDays = integrationSettings.dataDumpRange;

    // Calculate date range
    const currentMoment = moment();
    const fromDateFormatted = currentMoment.subtract(dateRangeInDays, 'days').startOf('day').format('YYYY-MM-DDTHH:mm:ss');
    const toDateFormatted = moment().endOf('day').format('YYYY-MM-DDTHH:mm:ss');

    // Replace values in parsedRequestObject based on dataMappingPaths
    dataMappingPaths.forEach((path, index) => {
        const normalizedPath = path.replace(/\[([^\]]+)]/g, '.$1'); // Normalize path (handle array-like notation)
        const pathSegments = normalizedPath.split('.'); // Split the path into segments

        let targetObject = parsedRequestObject; // Start from the root of the parsedRequestObject

        // Traverse the object or array using the path segments
        for (let segmentIndex = 0; segmentIndex < pathSegments.length - 1; segmentIndex++) {
            const segmentKey = pathSegments[segmentIndex];

            // Handle array index if applicable
            if (Array.isArray(targetObject)) {
                const arrayIndex = parseInt(segmentKey, 10);
                if (isNaN(arrayIndex) || arrayIndex < 0 || arrayIndex >= targetObject.length) {
                    throw new Error(`Invalid array index: ${segmentKey}`);
                }
                targetObject = targetObject[arrayIndex]; // Move to the next array element
            } else if (typeof targetObject === 'object' && segmentKey in targetObject) {
                targetObject = targetObject[segmentKey]; // Traverse deeper into the object
            } else {
                throw new Error(`Invalid path: ${path}`);
            }
        }

        // Final key to update
        const finalKey = pathSegments[pathSegments.length - 1];

        // Replace value for the final key based on the index of the element in dataMappingPaths
        if (typeof targetObject === 'object' && finalKey in targetObject) {
            if (targetObject[finalKey] === 'date') { // Check if it's a date field
                // Dynamically assign the correct date value
                targetObject[finalKey] = index === 0 ? fromDateFormatted : toDateFormatted;
            }
        } else {
            throw new Error(`Key not found: ${finalKey}`);
        }
    });

    return parsedRequestObject;
}




module.exports = { integrationOperationsServices }