const { default: mongoose } = require("mongoose");
const CPDWorkordersModel = require("../models/CPDWorkordersModel");
const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");
const integrationsSettingsModel = require("../models/integrationsSettingsModel");
const serviceProviderIntegrationsModel = require("../models/serviceProviderIntegrationsModel");
const serviceProviderServicesModel = require("../models/serviceProviderServicesModel");
const { validateServiceProviders, validateSPAuthentication } = require("./serviceProviderAuthModel");
const { GlobalHTTPMethods } = require("./sourceAndDestinationSyncModel");
const moment = require('moment');
require("dotenv").config();

/**
 * 
 * @param {*} integrationObject holds field N X number of mapping records (Both source & destination)
 * 1. First, we are looping the integration mappings (N X number). 
 * 2. Authenticate & get required tokens
 * 3. Fetch source side data objects by calling API calls.  
 * 4. Insert into source side collections with new status and required data points. 
 */
const destinationIntegrationOperationsServices = async (integrationObject) => {
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
    const authToken = await getServiceproviderAuthResponse(data.integrationsMasterId, data.to);
    let integrationDetails = data
    // Sort services by priority and process them one by one
    const sortedServices = data.destinationIntegrationServices.sort((a, b) => a.priority - b.priority);
    await processSIServiceCalls(sortedServices, data.integrationsMasterId, data.to, authToken, integrationDetails);
};

// Function to process services with dependencies
const processSIServiceCalls = async (services, integrationsMasterId, sourceProvider, authToken, integrationDetails, responseData = null) => {
    // Use a helper function to process a single service
    const processService = async (serviceObject, dependentData = null) => {
        if (dependentData) {
            serviceObject.dependentData = dependentData; // Attach dependent data
        }

        if (serviceObject.serviceMethod === 'post' && integrationDetails.from === "CPD") {
            // Fetch documents in parallel

            // const requestDataToBeSent = await mongoose.connection.db.collection("cpdtestdataobject").find({
            //     integrationsMasterId: integrationsMasterId,
            //     accountId: integrationDetails.accountId,
            //     status: "initiated"
            // });
            // console.log('requestDataToBeSent:===',requestDataToBeSent)
            const cursor = mongoose.connection.db
                .collection("cpdtestdataobject")
                .find({
                    integrationsMasterId: integrationsMasterId,
                    accountId: integrationDetails.accountId,
                    status: "initiated",
                }).limit(2);

            const requestDataToBeSent = [];
            for await (const doc of cursor) {
                requestDataToBeSent.push(doc);
            }

            if (requestDataToBeSent.length > 0) {
                // Process all documents in parallel
                const responses = await Promise.all(
                    requestDataToBeSent.map(async data => {
                        serviceObject.dataToSend = JSON.parse(data.responseObject); // Attach the data to the service object
                        serviceObject.referenceStatus = data.refWorkOrderStatus
                        return processIntegrationService(
                            serviceObject,
                            integrationsMasterId,
                            sourceProvider,
                            authToken,
                            integrationDetails
                        );
                    })
                );
                // Combine responses for recursive calls
                for (const currentResponse of responses) {
                    let dataMappingPathKey = serviceObject.dataMappingPath[0];
                    if (currentResponse[`${dataMappingPathKey}`]?.length > 0) {
                        const remainingServices = services.filter(s => s.priority > serviceObject.priority);

                        if (remainingServices.length > 0) {
                            // Recursive call for next priority services
                            await processSIServiceCalls(
                                remainingServices,
                                integrationsMasterId,
                                sourceProvider,
                                authToken,
                                integrationDetails,
                                currentResponse[`${dataMappingPathKey}`]
                            );
                        }
                    }
                }
            }
        } else {
            // Process single service for non-CPD or non-post scenarios
            const currentResponse = await processIntegrationService(
                serviceObject,
                integrationsMasterId,
                sourceProvider,
                authToken,
                integrationDetails
            );

            let dataMappingPathKey = serviceObject.dataMappingPath[0];
            if (currentResponse !== undefined && currentResponse[`${dataMappingPathKey}`]?.length > 0) {
                const remainingServices = services.filter(s => s.priority > serviceObject.priority);

                if (remainingServices.length > 0) {
                    await processSIServiceCalls(
                        remainingServices,
                        integrationsMasterId,
                        sourceProvider,
                        authToken,
                        integrationDetails,
                        currentResponse[`${dataMappingPathKey}`]
                    );
                }
            }
        }
    };

    // Process all services in parallel
    await Promise.all(services.map(serviceObject => processService(serviceObject, responseData)));
};


// Function to process a single service
const processIntegrationService = async (serviceObject, integrationsMasterId, sourceProvider, authToken, integrationDetails) => {
    let responseData;
    switch (serviceObject.serviceMethod) {
        case 'post':
            const requestObject = await getRequestPayload(integrationsMasterId, sourceProvider, serviceObject, integrationFieldMappingDetails = integrationDetails);
            console.log('requestObject:===', requestObject)
            // return true
            // console.log('POST Payload:', requestObject);
            responseData = await GlobalHTTPMethods.handlePost(serviceObject, authToken, requestObject, integrationDetails);
            console.log('responseData:===',responseData)
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

/*
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
*/
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
            ? { Authorization: `Bearer ${validationResult.responseData.access_token}` ,'Content-Type': 'application/json'}
            : validationResult.responseData;
    });

    return authResponse;
}


// Main function to get the service payload
async function getRequestPayload(integrationMasterId, sourceServiceProvider, serviceObject, integrationFieldMappingDetails) {
    const serviceDetails = await fetchServiceDetails(serviceObject.serviceProviderServiceId);
    const integrationSettings = await fetchIntegrationSettings(integrationMasterId);

    const destinationSettingsData = await serviceProviderIntegrationsModel.findOne({ from: integrationFieldMappingDetails.from, to: integrationFieldMappingDetails.to })
    // console.log('sourceSettingsData:===',sourceSettingsData)
    const updatedPayload = updatePayloadWithMappings(integrationFieldMappingDetails.mappedDataPoints, destinationSettingsData?.settings?.mappingSettings, serviceObject.dataToSend, destinationSettingsData?.settings?.statusSettings, serviceObject.referenceStatus);

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

function getNestedValue(obj, path) {
    // Ensure obj is an object before proceeding
    if (obj === null || obj === undefined) {
        return undefined; // Return undefined if obj is null or undefined
    }
    // console.log('path:==',path)
    if (typeof path !== 'string') {
        return path;
    }
    const keys = path.split('.'); // Split the path into keys
    let result = obj;

    for (const key of keys) {
        if (result && typeof result === 'object') {
            // Check for array access (e.g., WorkDetails.Assets[0].Comment)
            const arrayMatch = key.match(/^(.+)\[(\d+)]$/);
            if (arrayMatch) {
                const arrayKey = arrayMatch[1]; // e.g., "Assets"
                const index = parseInt(arrayMatch[2], 10); // Index of array
                if (Array.isArray(result[arrayKey]) && result[arrayKey][index] !== undefined) {
                    result = result[arrayKey][index];
                } else {
                    return undefined;
                }
            } else if (key in result) {
                result = result[key]; // Access the next level in the object
            } else {
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


function updatePayloadWithMappings(mappedDataPoints, destinationMappingSettings, dataToSend, statusSettings, referenceStatus) {
    // Ensure dataToSend is an object
    if (dataToSend === null || dataToSend === undefined) {
        console.error('The provided dataToSend object is null or undefined');
        return mappedDataPoints; // Return original object if dataToSend is invalid
    }

    Object.entries(mappedDataPoints).forEach(([mappedKey, value]) => {
        // console.log('value:===',value)
        if (value === 'settings.referenceStatus') {
            statusKey = assignStatus(referenceStatus, statusSettings)
            mappedDataPoints[mappedKey] = statusKey;
        }
        if (typeof value === 'object' && !Array.isArray(value)) {
            // For nested objects in mappedDataPoints
            Object.keys(value).forEach((subKey) => {
                const subKeyPath = `${mappedKey}.${subKey}`;
                const nestedValue = getNestedValue(dataToSend, subKeyPath);

                if (nestedValue !== undefined) {
                    // Update only if a valid value is found
                    if (!mappedDataPoints[mappedKey]) {
                        mappedDataPoints[mappedKey] = {}; // Initialize if needed
                    }
                    mappedDataPoints[mappedKey][subKey] = nestedValue;
                }
            });
        } else {
            // For direct paths (non-object values)
            const valueFromDataToSend = getNestedValue(dataToSend, value);
            if (valueFromDataToSend !== undefined) {
                mappedDataPoints[mappedKey] = valueFromDataToSend;
            }
        }
    });
    // console.log('destinationMappingSettings:==',destinationMappingSettings)
    mappedDataPoints = Object.assign(mappedDataPoints, destinationMappingSettings)
    // mappedDataPoints = destinationMappingSettings === true ? Object.assign(mappedDataPoints,destinationMappingSettings) : mappedDataPoints
    console.log('mappedDataPoints:==', mappedDataPoints)

    const nestedObject = keysToNestedObjectWithArrays(mappedDataPoints);
    // console.log(JSON.stringify(nestedObject, null, 2));
    return (JSON.stringify(nestedObject, null, 2));
}

function keysToNestedObjectWithArrays(mappedDataPoints) {
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