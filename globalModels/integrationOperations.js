const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");
const integrationsSettingsModel = require("../models/integrationsSettingsModel");
const serviceProviderServicesModel = require("../models/serviceProviderServicesModel");
const { validateServiceProviders } = require("./serviceProviderAuthModel");
const { GlobalHTTPMethods } = require("./sourceAndDestinationSyncModel");
const moment = require('moment');


const integrationOperationsServices = async (integrationObject) => {
    //** devide the loops into indiviual funstions. */
    const sourceIntegrationServices = integrationObject.forEach(async (data) => {
        const authToken = await getIntegrationAuthResponse(data.integrationsMasterId, data.from)
        data.sourceIntegrationServices.forEach(async (item) => {
            switch (item.serviceMethod) {
                case 'post':
                    const servicepayload = await getServicePayload(data.integrationsMasterId, integrationObject.from, item.serviceProviderServiceId)
                    console.log('servicepayload:==',servicepayload)
                    await GlobalHTTPMethods.handlePost(item, authToken, servicepayload)
                    break;
                // case 'get':
                // console.log('item.serviceMethod:==',item.serviceMethod)
                //     await GlobalHTTPMethods.handleGet(data.sourceIntegrationServices, authToken)
                default:
                    break;
            }
        })
    });
}

async function getIntegrationAuthResponse(integrationMasterId, sourceServiceProvider) {
    console.log('integrationMasterId:---',integrationMasterId,sourceServiceProvider)
    const serviceProviderDetails = await integrationsMasterServiceProvidersModel.findOne({
        integrationsMasterId: integrationMasterId,
        serviceProvider: sourceServiceProvider,
    });

    if (!serviceProviderDetails || !serviceProviderDetails.credentials) {
        throw new Error('Service provider credentials not found.');
    }
    const authResponse = await validateServiceProviders(serviceProviderDetails.credentials)
        .then((validationResult) => {
            return validationResult.requestMethod === 'body'
                ? { Authorization: `Bearer ${validationResult.responseData.access_token}` }
                : validationResult.responseData;
        });

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
    dataMappingPaths.forEach((path) => {
        const normalizedPath = path.replace(/\[([^\]]+)]/g, '.$1'); 
        const pathSegments = normalizedPath.split('.'); 

        let targetObject = parsedRequestObject;

        // Traverse to the target key
        for (let segmentIndex = 0; segmentIndex < pathSegments.length - 1; segmentIndex++) {
            const segmentKey = pathSegments[segmentIndex];
            if (Array.isArray(targetObject)) {
                const arrayIndex = parseInt(segmentKey, 10);
                if (isNaN(arrayIndex) || arrayIndex < 0 || arrayIndex >= targetObject.length) {
                    throw new Error(`Invalid array index: ${segmentKey}`);
                }
                targetObject = targetObject[arrayIndex];
            } else if (typeof targetObject === 'object' && segmentKey in targetObject) {
                targetObject = targetObject[segmentKey];
            } else {
                throw new Error(`Invalid path: ${path}`);
            }
        }
        // Replace value for the final key
        const finalKey = pathSegments[pathSegments.length - 1];
        if (typeof targetObject === 'object' && finalKey in targetObject) {
            if (targetObject[finalKey] === 'date') { // Check data type
                targetObject[finalKey] = finalKey.toLowerCase() === 'from' ? fromDateFormatted : toDateFormatted;
            }
        } else {
            throw new Error(`Key not found: ${finalKey}`);
        }
    });

    return parsedRequestObject;
}



module.exports = { integrationOperationsServices }