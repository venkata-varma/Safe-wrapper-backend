
const SNOWConfigurations = require('../config/integrationsConfiguration');
const integrationsExceptionsModel = require('../models/integrationsExceptionsModel');
const { decryptData } = require('../utils/encryptionAlgorithms');
const querystring = require('querystring')
const axios = require('axios');
const integrationsCronsModel = require('../models/integrationsCronsModel');
const SNOWWorkOrdersModel = require('../models/SNOWWorkOrdersModel');
const integrationsMasterModel = require('../models/integrationsMasterModel');
const workOrderLifeCycleModel = require('../models/workOrderLifeCycleModel');
const CPDWorkordersModel = require('../models/CPDWorkordersModel');
const integrationsSettingsModel = require('../models/integrationsSettingsModel');
const urlConfigurations = require('../config/integrationsConfiguration');
const integrationsMasterServiceProvidersModel = require('../models/integrationsMasterServiceProvidersModel');
const { CPDAuthentication } = require('../utils/serviceProvidersAuthentication');
const { exceptionLogs } = require('./exceptionOperation');
const { SNOWAuthToken } = require('../utils/serviceProvidersAuthentication')
/**
 * 
 * baseUrl, username, password, client_id, client_secret, grant_type, required to generate the access token.
 * @returns access token
 */

const SNOWAuthentication = async (baseUrl, username, password, client_id, client_secret, grant_type, integrationObject) => {
    try {
        const data = querystring.stringify({
            username: username,
            password: password,
            client_id: client_id,
            client_secret: client_secret,
            grant_type: grant_type
        });
        const ValidateSNOWCredentials = await axios.post(
            baseUrl,
            data,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        // console.log('ValidateSNOWCredentials:==', ValidateSNOWCredentials.data);
        return ValidateSNOWCredentials.data;
    } catch (error) {
        console.log("SNOWAuthError:==", error.response ? error.response.data : error.message);

        await integrationsExceptionsModel.create({
            integrationsMasterId: integrationObject.integrationsMasterId,
            accountId: integrationObject.accountId,
            networkCode: error.response.status,
            exceptionMessage: "Authorization has been denied for this request.",
            exceptionTitle: error.response.data.error_description,
            integrationsApiServices: 'auth-failed'
        })
        return 'error';
    }
};


/**
 * 
 * @param {*} SNOWWorkOrderResponse have the workOrders which are generated using SNOW get workOrders end point.  
 * @param {*} cronJobDetails is already intiated. Here we will update the cronJob id into the SNOWWorkOrderModel.
 * then loop the SNOWWorkOrderResponse which have the WorkOrders and create each workorder as individual record into the DB.
 * If a record aready exist in DB. It will update the details using WorkOrderId, accountId, integrationMasterId, status of WorkOrder which is not equal to the previous.
 * @returns number of workOrders pulled from the SNOW.
 */

const validateSNOWNewAndUpdateIncidents = async (SNOWWorkOrderDetails, integrationObject, cronJobId) => {
    const latestWorkOrderCount = {
        pullNewWorkOrdersCount: 0,
        pushNewWorkordersCount: 0
    }

    for (let incident of SNOWWorkOrderDetails) {
        let incidentDetails = {
            accountId: integrationObject.accountId,
            integrationsMasterId: integrationObject.integrationsMasterId,
            integrationsCronId: cronJobId,
            SNOWWorkOrderId: incident.number,
            SNOWWorkOrders: incident,
        }
        let incidentExist = await SNOWWorkOrdersModel.findOne({
            accountId: integrationObject.accountId,
            integrationsMasterId: integrationObject.integrationsMasterId,
            SNOWWorkOrderId: incident.number,
        });

        if (incidentExist) {
            await SNOWWorkOrdersModel.findOneAndUpdate({
                accountId: integrationObject.accountId,
                integrationsMasterId: integrationObject.integrationsMasterId,
                SNOWWorkOrderId: incident.number,
            }, { ...incidentDetails }, { new: true });

            // insert work order life cycle.
            await workOrderLifeCycleModel.create({
                accountId: integrationObject.accountId,
                integrationsMasterId: integrationObject.integrationsMasterId,
                integrationsCronId: cronJobId,
                workOrderStatus: incident.upon_approval,
                SNOWWorkOrderId: incident.number,
                SNOWWorkOrders: incident,
                serviceProvider: "SNOW",
                date_created: new Date()
            });
        }
        else {
            await SNOWWorkOrdersModel.create({
                ...incidentDetails
            });

            // insert work order life cycle.
            await workOrderLifeCycleModel.create({
                accountId: integrationObject.accountId,
                integrationsMasterId: integrationObject.integrationsMasterId,
                integrationsCronId: cronJobId,
                workOrderStatus: incident.upon_approval,
                SNOWWorkOrderId: incident.number,
                SNOWWorkOrders: incident,
                serviceProvider: "SNOW",
                date_created: new Date()
            });
            latestWorkOrderCount.pullNewWorkOrdersCount++
        }
    }
    // Final respective updates to dependency tables. say {integrationMasterUpdate}
    await integrationsMasterModel.findByIdAndUpdate(integrationObject.integrationsMasterId, { lastPullDate: new Date() }, { new: true });
    return latestWorkOrderCount;
}

/**
 * 
 * @param {*} cronIntegrationDetails
 * For every cron job starts, we insert record into table. 
 * @returns 
 */
const initiateCronJobs = async (cronIntegrationDetails, typeOfCron) => {
    const cronDetails = await integrationsCronsModel.create(
        {
            cronJobType: typeOfCron,
            accountId: cronIntegrationDetails.accountId,
            serviceProvider: cronIntegrationDetails.serviceProvider,
            integrationsMasterId: cronIntegrationDetails.integrationsMasterId
        }
    )
    return cronDetails
}

/**
 * 
 * @param {*} integrationObject it has the service provider credentials which are helfull to authunticate.
 * Intiate the cronJob.
 * Initially we get the service provider login credentials as String and then we will decrypt the credentials using decryptData function.
 * Then get the authorization token using SNOWAuthentication.
 * Then using authorization token and workOrder get url, we will get the workorders.
 * Update the cronJob details.
 */

exports.getSNOWWorkOrders = async (integrationObject, typeOfCron) => {
    let encrypted = {};
    let getSNOWWorkOrderdetails;

    // Insert into cron-job
    const cronJobDetails = await initiateCronJobs({
        accountId: integrationObject.accountId,
        serviceProvider: integrationObject.serviceProvider,
        integrationsMasterId: integrationObject.integrationsMasterId
    }, typeOfCron);

    // Find integration credentails and then decrypt and pull CPD calls.
    encrypted = { iv: process.env.CRYPTO_IV, encryptedData: integrationObject.credentials };
    decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY));
    const SNOWToken = await SNOWAuthentication(decryptConfigCredentials.baseUrl, decryptConfigCredentials.username, decryptConfigCredentials.password, decryptConfigCredentials.client_id, decryptConfigCredentials.client_secret, decryptConfigCredentials.grant_type, integrationObject);
    // console.log('SNOWToken:===',SNOWToken.access_token)

    // Get work orders from the SNOW - API calls.
    let SNOWWorkOrderDetails = await axios.get(`${SNOWConfigurations.SNOW.getAllIncidents.URL}`,
        {
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SNOWToken.access_token}`
            }
        }

    ).then(res => {
        //console.log("resData:===",res.data.result)
        return res.data.result
    }).catch(async (error) => {
        console.log("Get-ERROR:==", error.response.data)
        await integrationsExceptionsModel.create({
            integrationsMasterId: integrationObject.integrationsMasterId,
            accountId: integrationObject.accountId,
            networkCode: error.response.status,
            exceptionMessage: error.response.data.error.message,
            exceptionTitle: error.name,
            integrationsApiServices: 'get-workorder'
        })
    })

    // If you have atlease one work workorder from SNOW then process. 
    if (SNOWWorkOrderDetails.length > 0) {
        getSNOWWorkOrderdetails = await validateSNOWNewAndUpdateIncidents(SNOWWorkOrderDetails, integrationObject, cronJobDetails._id)
    }
    if (getSNOWWorkOrderdetails !== undefined) {
        const cronJob_Details = await integrationsCronsModel.findByIdAndUpdate(cronJobDetails._id, {
            pulledCount: getSNOWWorkOrderdetails.pullNewWorkOrdersCount || 0,
            pushedCount: getSNOWWorkOrderdetails.pushNewWorkordersCount,
            status: "completed"
        }, { new: true, upsert: true });
    }

}

/**
 * 
 * @param {*} fieldmappingkeys 
 * @param {*} WorkOrderNumber used to assign the value to numberAlt of DF.
 * @param {*} CPDWorkOrderStatus is used to change the status key of DF as per the CPD work order status.
 * @param {*} WorkType 
 * @returns updated fieldmappingkeys with urgency set to "1" if and only if Work order is of High prioity

 */
const getWorkOrderStatusFieldMappingkeysAndPriority = async (integrationFieldMappingkeys, CPDWorkOrderStatus, IntegrationStatusMappingKeys, CPDWorkOrderNumber) => {
    let statusMappingValue = Object.keys(IntegrationStatusMappingKeys).find(key => IntegrationStatusMappingKeys[key] === CPDWorkOrderStatus) || "2";

    integrationFieldMappingkeys.state = statusMappingValue.split('-').length > 1 ? statusMappingValue.split('-').join('_') : statusMappingValue
    
    if (statusMappingValue === "6" || statusMappingValue === "7" || statusMappingValue === "8") {
        integrationFieldMappingkeys.close_notes = "Closed/Resolved by Caller"
        integrationFieldMappingkeys.close_code = "Closed/Resolved by Caller"
    }

    //-------To set Priority, Urgency
    if (CPDWorkOrderNumber.includes('TMC')) {
        integrationFieldMappingkeys.urgency = 1;
        integrationFieldMappingkeys.severity = 1;
        integrationFieldMappingkeys.priority = 1;

    } else {
        integrationFieldMappingkeys.urgency = 2;
        integrationFieldMappingkeys.severity = 2;
        integrationFieldMappingkeys.priority = 2;

    }

    return integrationFieldMappingkeys;
}



// Function to get nested property value
const getNestedValue = (obj, path) => {
    if (!path) return '';
    if (typeof path !== 'string') return '';
    return path.split('.').reduce((acc, part) => {
        const arrayMatch = part.match(/(\w+)\[(\d+)\]/);
        if (arrayMatch) {
            const arrayKey = arrayMatch[1];
            const index = parseInt(arrayMatch[2], 10);
            return acc && acc[arrayKey] && acc[arrayKey][index];
        }
        return acc && acc[part];
    }, obj) || '';
};

/**
 * Map the CPD values from response to SNOW fieldMapping keys 
 *  @returns property values mapped from nested function "getNestedValue()"
 */ 

const mapCPDToSNOWFieldMappingKeys = async (response, dataPoints) => {
    const workOrder = response;
    const mappedDataPoints = {};
    //console.log("Datapooibts", dataPoints)
    //console.log("obhj", Object.keys(dataPoints))
    Object.keys(dataPoints).forEach((key) => {
        const modelKey = dataPoints[key];
        // console.log("modelKey", modelKey)
        if (typeof modelKey === 'string') {
            mappedDataPoints[key] = modelKey ? getNestedValue(workOrder, modelKey) : '';
        }
        else {
            mappedDataPoints[key] = modelKey;
        }
    });

    mappedDataPoints.location = `${workOrder.ServiceLocation.Address.Street1}, ${workOrder.ServiceLocation.Address.State}, ${workOrder.ServiceLocation.Address.Country}- ${workOrder.ServiceLocation.Address.PostalCode}`
    return mappedDataPoints;

}



/**
 * 
 * This function is used to get detailed work order object from "GET By ID" end-point of CPD
 * If above task is success, it sends required keys to nested function "mapCPDToSNOWFieldMappingKeys()" to get field mappings keys mapped to respective values
 * @returns updated fieldmappingkeys
 */
const CPDSNOWMappings = async (CPDWorkOrderId, MessageId, fieldmappingkeys, corrigoToken, integrationObject, decryptConfigCredentials, CPDWorkOrderNumber, SNOWWorkOrderId) => {
 
    let getCPDWorkOrderDetails = await axios.get(`${urlConfigurations.CPD.getWorkOrder.URL}messageId=${MessageId}&ids=${CPDWorkOrderId}`,
        {
            headers: { Authorization: `bearer ${corrigoToken}` }
        })
        .then(res => {
            // console.log('response:==',res.data)
            return res.data.WorkOrders[0]
        })
        .catch(async (error) => {
            console.log("ERROR:==", error)
            await exceptionLogs(integrationObject, error.response.status, error.response.data.Message, error.name, error.config.data, "cpd-get-workorder", CPDWorkOrderId, CPDWorkOrderNumber, "")
        
        });

    if (getCPDWorkOrderDetails) {
        fieldmappingkeys = await mapCPDToSNOWFieldMappingKeys(getCPDWorkOrderDetails, fieldmappingkeys)

        return fieldmappingkeys
    }

}

/**
 * 
 * @param {*} integrationObject getting the field mapping record object from the scheduler controller.
 * Find the Work order from the CPDWorkOrderModel using integraton id and account id.
 * Then map the fieldmapping keys which are matched with the CPD Work orders.
 * Post the work order to the SNOW.
 * Get the work order details using the id from the post request.
 * Save the record which work order pushed to the SNOW.
 * Then update the status of CPD work order as completed once successfully pushed the code to SNOW. 
 * If we encountered any error while post or get the work order to the SNOW. We have integrations exceptions log which stores the error log for specific work order.
 * Also update the SNOW work orders when the status of CPD work order changed.
 */


exports.SNOWCreateIncidents = async (integrationFieldObject, typeOfCron) => {

    if (integrationFieldObject !== undefined) {
        let fieldmappingkeys = {}
        let workOrderPushedCount = 0
        for (let integrationObject of integrationFieldObject) {

            // find initiated count of WO to push to SNOW
            const CPDWorkOrderDetails = await CPDWorkordersModel.find({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId, status: "initiated" }).lean();

            if (integrationObject.serviceMethod === "create") {

                // Now loop the CPDWO and then push to DF by API.
                for (let workOrder of CPDWorkOrderDetails) {
                    fieldmappingkeys = integrationObject.dataPoints
                    const getWorkOrderStatusDefaultMappingKeys = await integrationsSettingsModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId })

                    // Find list of DF credentails (encrypted) & then decrypt. 
                    let serviceProviderCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "SNOW" });

                    let credentailsObj = { iv: process.env.CRYPTO_IV, encryptedData: serviceProviderCredentials.credentials };
                    let decryptConfigCredentials = JSON.parse(await decryptData(credentailsObj, process.env.CRYPTO_KEY))

                    // Find integration credentails and then decrypt and pull CPD calls.
                    let CPDAuthCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "CPD" })
                    let encryptedDetails = { iv: process.env.CRYPTO_IV, encryptedData: CPDAuthCredentials.credentials };
                    let CPDdecryptConfigCredentials = JSON.parse(await decryptData(encryptedDetails, process.env.CRYPTO_KEY));
                    const corrigoToken = await CPDAuthentication(CPDdecryptConfigCredentials.client_id, CPDdecryptConfigCredentials.client_secret, CPDdecryptConfigCredentials.grant_type, CPDdecryptConfigCredentials.baseUrl);

                    fieldmappingkeys = await CPDSNOWMappings(workOrder.CPDWorkOrderId, workOrder.MessageId, fieldmappingkeys, corrigoToken, integrationObject, decryptConfigCredentials, workOrder.CPDWorkOrders.WorkOrderNumber, "")


                    fieldmappingkeys = await getWorkOrderStatusFieldMappingkeysAndPriority(fieldmappingkeys, workOrder.CPDWorkOrderStatus, getWorkOrderStatusDefaultMappingKeys.statusFieldMappingKeys, workOrder.CPDWorkOrders.WorkOrderNumber)


                    // fieldmappingkeys.statusDate = new Date().toJSON()
                    console.log('Createfieldmappingkeys:===',fieldmappingkeys)

                    let SNOWWorkOrderId; let SNOWWorkorderList = {};

                    let snowAuthToken = await SNOWAuthToken(decryptConfigCredentials.baseUrl, decryptConfigCredentials.username, decryptConfigCredentials.password, decryptConfigCredentials.client_id, decryptConfigCredentials.client_secret, "password")

                    if (!snowAuthToken.hasOwnProperty('access_token')) {
                         await exceptionLogs(integrationObject, error.response.status, error.message, JSON.stringify(error.response.data.messages), JSON.stringify(error.config.data), "snow-create-workorder", workOrder.CPDWorkOrderId, workOrder.CPDWorkOrders.WorkOrderNumber, "")
                    }

                    let SNOWWorkOrderDetails = await axios.post(
                        urlConfigurations.SNOW.postIncident.URL,
                        fieldmappingkeys,
                        {
                            headers: {
                                'Authorization': `Bearer ${snowAuthToken.access_token}`,
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            }
                        },

                    ).then((res) => {
                        console.log("snowowkrirdrId", res.data.result.number)
                        return res.data.result
                    }).catch(async (err) => {
                        console.log("err", err)
                        await exceptionLogs(integrationObject, err.response.status, err.response.data.Message, err.name, err.config.data, "snow-post-incident", workOrder.CPDWorkOrderId, workOrder.CPDWorkOrderNumber, " ")
                            return 'error'
                    })

let SNOWWorkOrderClone=SNOWWorkOrderDetails

                    if (SNOWWorkOrderDetails !== 'error') {


                        
                            let updatedSNOWWorkOrderStatus = urlConfigurations.SNOW.SNOWStatusMappings[SNOWWorkOrderClone.state]
                            let snowWorkOrderNumber= SNOWWorkOrderClone.number

                            const listOfSNOWWorkorderDetails = await SNOWWorkOrdersModel.findOne({ SNOWWorkOrderId: snowWorkOrderNumber, }).lean();
                            console.log("listOfSNOWWorkorderDetails", listOfSNOWWorkorderDetails)
                            if (listOfSNOWWorkorderDetails) {
                                await SNOWWorkOrdersModel.findOneAndUpdate({
                                    SNOWWorkOrderId: SNOWWorkOrderDetails.number, integrationsMasterId: integrationObject.integrationsMasterId,
                                    accountId: integrationObject.accountId,
                                }, { SNOWWorkOrderStatus: updatedSNOWWorkOrderStatus, status: "completed", SNOWWorkOrders: SNOWWorkOrderDetails }, { new: true, runValidators: true }).lean()
                            }
                            else {

                                const SNOWWorkOrderDetails = await SNOWWorkOrdersModel.create({
                                    integrationsMasterId: integrationObject.integrationsMasterId,
                                    accountId: integrationObject.accountId,
                                    integrationsCronId: workOrder.integrationsCronId,
                                    SNOWWorkOrderId: snowWorkOrderNumber,
                                    SNOWWorkOrders: SNOWWorkOrderClone,
                                    SNOWWorkOrderStatus: updatedSNOWWorkOrderStatus,
                                    priority: SNOWWorkOrderClone.urgency === "1" ? "high" : "medium",
                                    status: "completed",
                                });
                                await CPDWorkordersModel.findOneAndUpdate({ CPDWorkOrderId: workOrder.CPDWorkOrderId, integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId }, { status: "completed" }, { new: true })
                                workOrderPushedCount++
                                await integrationsCronsModel.findByIdAndUpdate(workOrder.integrationsCronId, { pushedCount: workOrderPushedCount }, { new: true });
                                // insert work order life cycle.
                                await workOrderLifeCycleModel.create({
                                    workOrderId: SNOWWorkOrderClone.sys_id,
                                    WorkOrderNumber: SNOWWorkOrderClone.number,
                                    workOrderStatus: updatedSNOWWorkOrderStatus,
                                    accountId: integrationObject.accountId,
                                    integrationsMasterId: integrationObject.integrationsMasterId,
                                    serviceProvider: "SNOW",
                                    date_created: new Date()
                                });
                            }
                        
                    }
                }
            }
            if (integrationObject.serviceMethod === "update") {

                // Update work orders to the Dataforma.
                const updateRequestSNOWWorkorders = await SNOWWorkOrdersModel.find({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId, status: "update-request" })

                for (let SNOWWorkOrder of updateRequestSNOWWorkorders) {
                    fieldmappingkeys = integrationObject.dataPoints
                    const getCPDWorkOrderStatus = await CPDWorkordersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId, "CPDWorkOrders.WorkOrderNumber": SNOWWorkOrder.SNOWWorkOrders.user_input })

                    const getWorkOrderStatusDefaultMappingKeys = await integrationsSettingsModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId })

                    // Find integration credentails and then decrypt and pull CPD calls.
                    let CPDAuthCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "CPD" })
                    let encryptedDetails = { iv: process.env.CRYPTO_IV, encryptedData: CPDAuthCredentials.credentials };
                    let CPDdecryptConfigCredentials = JSON.parse(await decryptData(encryptedDetails, process.env.CRYPTO_KEY));
                    const corrigoToken = await CPDAuthentication(CPDdecryptConfigCredentials.client_id, CPDdecryptConfigCredentials.client_secret, CPDdecryptConfigCredentials.grant_type, CPDdecryptConfigCredentials.baseUrl);

                    let serviceProviderCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "SNOW" });
                    let encrypted = { iv: process.env.CRYPTO_IV, encryptedData: serviceProviderCredentials.credentials };
                    // console.log("Step-1 called");

                    let decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY))

                    fieldmappingkeys = await CPDSNOWMappings(getCPDWorkOrderStatus.CPDWorkOrderId, getCPDWorkOrderStatus.MessageId, fieldmappingkeys, corrigoToken, integrationObject, decryptConfigCredentials, getCPDWorkOrderStatus.CPDWorkOrders.WorkOrderNumber, SNOWWorkOrder.SNOWWorkOrderId)

                    fieldmappingkeys = await getWorkOrderStatusFieldMappingkeysAndPriority(fieldmappingkeys, getCPDWorkOrderStatus.CPDWorkOrderStatus, getWorkOrderStatusDefaultMappingKeys.statusFieldMappingKeys, getCPDWorkOrderStatus.CPDWorkOrders.WorkOrderNumber)


                    let snowAuthToken = await SNOWAuthToken(decryptConfigCredentials.baseUrl, decryptConfigCredentials.username, decryptConfigCredentials.password, decryptConfigCredentials.client_id, decryptConfigCredentials.client_secret, "password")

                    if (!snowAuthToken.hasOwnProperty('access_token')) {
                        await exceptionLogs(integrationObject, snowAuthToken.response.status, snowAuthToken.message, JSON.stringify(snowAuthToken.response.data.messages), JSON.stringify(snowAuthToken.config.data), "snow-create-workorder", workOrder.CPDWorkOrderId, workOrder.CPDWorkOrders.WorkOrderNumber, SNOWWorkOrder.SNOWWorkOrderId)
                    }
                    //     console.log('Updatefieldmappingkeys:===', fieldmappingkeys);
                    let SNOWWorkorderList = {}
                    let SNOWWorkOrderId
                    console.log("clodesdnotsmandatory", fieldmappingkeys)
                    let SNOWUpdatedWorkOrderId=await axios.patch(
                        `${urlConfigurations.SNOW.updateIncidentById.URL}/${SNOWWorkOrder.SNOWWorkOrders.sys_id}`,
                        fieldmappingkeys, 
                        {
                            headers: {
                                'Authorization': `Bearer ${snowAuthToken.access_token}`,
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            }
                        },

                    ).then((res) => {

                        return res.data.result
                    }).catch(async (err) => {
                        console.log("err", err)
                        await exceptionLogs(integrationObject, err.response.status, err.response.data.Message, err.name, err.config.data, "snow-patch-incident", CPDWorkOrderId, CPDWorkOrderNumber, SNOWWorkOrder.SNOWWorkOrderId)
                                return 'error'
                    })
console.log("SNOWUpdatedWorkOrderId", SNOWUpdatedWorkOrderId)
                        if (SNOWUpdatedWorkOrderId !== 'error' ) {
                            let updatedSNOWWorkOrderStatus = urlConfigurations.SNOW.SNOWStatusMappings[SNOWUpdatedWorkOrderId.state]
                         let    SNOWWorkOrderNumber = SNOWUpdatedWorkOrderId.number
                            const listOfSNOWWorkorderDetails = await SNOWWorkOrdersModel.findOne({ SNOWWorkOrderId: SNOWWorkOrderNumber }).lean();
                            if (listOfSNOWWorkorderDetails) {

                                await SNOWWorkOrdersModel.findOneAndUpdate({
                                    SNOWWorkOrderId: SNOWWorkOrder.SNOWWorkOrderId, integrationsMasterId: integrationObject.integrationsMasterId,
                                    accountId: integrationObject.accountId,
                                }, {
                                    SNOWWorkOrders: SNOWUpdatedWorkOrderId,
                                    SNOWWorkOrderStatus: updatedSNOWWorkOrderStatus,
                                    status: "completed"
                                }, { new: true }).lean()

                                // insert work order life cycle.
                                await workOrderLifeCycleModel.create({
                                    workOrderId: SNOWUpdatedWorkOrderId.sys_id,
                                    WorkOrderNumber: SNOWUpdatedWorkOrderId.number,
                                    workOrderStatus: updatedSNOWWorkOrderStatus,
                                    accountId: integrationObject.accountId,
                                    integrationsMasterId: integrationObject.integrationsMasterId,
                                    serviceProvider: "SNOW",
                                    date_created: new Date()
                                });
                            }
                            else {
                                //nothing
                            }
                        }
                }
            }
        }
    }
}