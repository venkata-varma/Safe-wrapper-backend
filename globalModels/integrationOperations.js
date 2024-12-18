const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");
const integrationsSettingsModel = require("../models/integrationsSettingsModel");
const serviceProviderServicesModel = require("../models/serviceProviderServicesModel");
const { validateServiceProviders } = require("./serviceProviderAuthModel");
const { GlobalHTTPMethods } = require("./sourceAndDestinationSyncModel");

const integrationOperationsServices = async (integrationObject) => {
    //** devide the loops into indiviual funstions. */
    const sourceIntegrationServices = integrationObject.forEach(async (data) => {
        const authToken = await getIntegrationAuthResponse(data.integrationsMasterId, integrationObject.from)
        data.sourceIntegrationServices.forEach(async (item) => {
            switch (item.serviceMethod) {
                case 'post':
                    const servicepayload = await getServicePayload(data.integrationsMasterId, integrationObject.from, item.serviceProviderServiceId)
                    await GlobalHTTPMethods.handlePost(data.sourceIntegrationServices, authToken, servicepayload)
                    break;
                case 'get':
                    await GlobalHTTPMethods.handleGet(data.sourceIntegrationServices, authToken)
                default:
                    break;
            }
        })
    });
}

async function getIntegrationAuthResponse (integrationsMasterId, sourceServiceProvider) {
    const serviceProviderAuthResponse = await validateServiceProviders(await integrationsMasterServiceProvidersModel.findOne({integrationsMasterId:integrationsMasterId, serviceProvider:sourceServiceProvider}).credentials)
                                        .then((res)=>{
                                            return res.requestMethod === 'body' ? { Authorization: `bearer ${res.responseData.access_token}` } : res.responseData
                                        })
    return serviceProviderAuthResponse
}

async function getServicePayload(integrationsMasterId, sourceServiceProvider, serviceProviderServiceId){
    const serviceProviderServiceDetails = await serviceProviderServicesModel.findById(serviceProviderServiceId)
    const requestObject = serviceProviderServiceDetails.requestObject
    
    const getIntegrationsSettingsDetails = await integrationsSettingsModel.findOne({ integrationsMasterId: integrationsMasterId});
    const getDateRange = getIntegrationsSettingsDetails.dataDumpRange
    
    let payload
    let currentDate = moment();
    let formattedFromDate = moment(currentDate).subtract(getDateRange, 'days').startOf('day');
    let formattedToDate  = moment().endOf('day');
    fromDate = formattedFromDate.format('YYYY-MM-DDTHH:mm:ss');
    toDate   = formattedToDate.format('YYYY-MM-DDTHH:mm:ss');
    payload = {
        "Parameters": {
            //"WorkOrderNumber":"POS4L20001", /*Search by work order number
            /* Search by'Created', 'AcknowledgeBy', 'OnSiteBy', 'DueDate', 'LastUpdate'*/
            "Created": {
                "From": fromDate,
                "To": toDate
                // "From":"2024-07-12T00:00:00",
                // "To":"2024-07-19T23:59:59"
                // "To": "2024-02-14T24:00:00.000Z"
            },
            /*Search by work order status -> New,Accepted,Recalled,Rejected,CheckedIn,Paused,CheckedOut,OnHold,Verified,NeedsCompletionDetails*/
            // "Statuses":getStatusesToSearchWO
            //,"CustomerId" :"90256"
        },
        "MessageId": "f6b492c9-ee7d-4e1b-a9a8-29f50f0b6d3a"
    }
   
}

module.exports = { integrationOperationsServices }