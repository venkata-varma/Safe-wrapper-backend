
const CYSConfigurations = require('../config/integrationsConfiguration')
const axios = require('axios');
const CPDWorkordersModel = require('../models/CPDWorkordersModel');
const DFWorkOrdersModel = require('../models/DFWorkOrdersModel');
const integrationsExceptionsModel = require('../models/integrationsExceptionsModel');
const integrationsCronsModel = require('../models/integrationsCronsModel');
const asyncWrapper = require('./asyncWrapper');
const integrationsMasterServiceProvidersModel = require('../models/integrationsMasterServiceProvidersModel');
const { decryptData } = require('../utils/encryptionAlgorithms');
const { CPDAuthentication } = require('../utils/serviceProvidersAuthentication');
const workOrderLifeCycleModel = require('../models/workOrderLifeCycleModel');
const configurations = require('../config/integrationsConfiguration');
const CYSWorkordersModel = require('../models/CYSWorkordersModel');
const integrationsSettingsModel = require('../models/integrationsSettingsModel');
const { exceptionLogs } = require('./exceptionOperation');

// Function to get nested property value
const getNestedValue = (CPDWorkOrderResponse, integrationFieldMappingKey) => {
    if (!integrationFieldMappingKey) return "";
    if (typeof integrationFieldMappingKey !== 'string') return "";

    return integrationFieldMappingKey.split('.').reduce((currentValue, fieldMappingkey) => {
        const fieldMappingkeyMatch = fieldMappingkey.match(/(\w+)\[(\d+)\]/);
        if (fieldMappingkeyMatch) {
            const fieldMappingMatchKey = fieldMappingkeyMatch[1];
            const index = parseInt(fieldMappingkeyMatch[2], 10);
            return currentValue && currentValue[fieldMappingMatchKey] && currentValue[fieldMappingMatchKey][index];
        }
        return currentValue && currentValue[fieldMappingkey];
    }, CPDWorkOrderResponse) || "";
}

// Map the CPD values from response to DF fieldMapping keys
const mapCPDValuestoCYSFieldMappingKeys = async(CPDWorkOrderResponse, integrationFieldMappingKeys) => {
    const mappedDataPoints = {};

    Object.keys(integrationFieldMappingKeys).forEach((key) => {
        const CPDWorkOrderMappingKey = integrationFieldMappingKeys[key];

        if (typeof CPDWorkOrderMappingKey === 'object' && !Array.isArray(CPDWorkOrderMappingKey)) {
            mappedDataPoints[key] = {};
            Object.keys(CPDWorkOrderMappingKey).forEach((subKey) => {
                const modelKey = CPDWorkOrderMappingKey[subKey];
                if (typeof modelKey === 'string') {
                    mappedDataPoints[key][subKey] = modelKey ? getNestedValue(CPDWorkOrderResponse, modelKey) : "";
                } else {
                    mappedDataPoints[key][subKey] = modelKey;
                }
            });
        } else if (typeof CPDWorkOrderMappingKey === 'string') {
            mappedDataPoints[key] = CPDWorkOrderMappingKey ? getNestedValue(CPDWorkOrderResponse, CPDWorkOrderMappingKey) : "";
        } else {
            mappedDataPoints[key] = CPDWorkOrderMappingKey;
        }
    });
    return mappedDataPoints;
}



/**
 * 
 * This function is used to map the buildingId which gets from the individual work order details of CPD API.
 * If encounters any error during the service call it creates an exception.
 * @returns updated fieldmappingkeys
 */

const getCPDFieldMappingkeys = async (CPDWorkOrderId, MessageId, fieldmappingkeys, corrigoToken, integrationObject, CPDWorkOrderNumber, CYSWorkOrderId) => {
    
    let getCPDWorkOrderDetails = await axios.get(`${configurations.CPD.getWorkOrder.URL}messageId=${MessageId}&ids=${CPDWorkOrderId}`,
        {
            headers: { Authorization: `bearer ${corrigoToken}` }
        })
        .then(res => {
            // console.log('response:==',res.data.WorkOrders[0])
            return res.data.WorkOrders[0]
        })
        .catch(async (error) => {
            console.log("ERROR:==", error)   
            await exceptionLogs(integrationObject, error.response.status, error.response.data.Message, error.name, error.config.data, "cpd-get-workorder", CPDWorkOrderId, CPDWorkOrderNumber, CYSWorkOrderId)
        });
    if (getCPDWorkOrderDetails) {
        fieldmappingkeys = await mapCPDValuestoCYSFieldMappingKeys(getCPDWorkOrderDetails, fieldmappingkeys)
        fieldmappingkeys['estimate.CompanyName'] = getCPDWorkOrderDetails.Customer.Name + " - " + getCPDWorkOrderDetails.ServiceLocation.Address.Street1 || ""
        fieldmappingkeys['estimate.description'] = CPDWorkOrderId + " - " + getCPDWorkOrderDetails.ServiceLocation.Address.Street1 || "DevRabbit Testing WorkOrders (Ignore)."
    }
    return fieldmappingkeys
}

/**
 * Prepare the fieldmappingkeys object as per the requirement
 */
const getDefaultFieldMappingKeys = async (fieldmappingkeys) => {
    // Ensure the necessary nested objects are initialized
    if (!fieldmappingkeys.estimate) {
        fieldmappingkeys.estimate = {};
    }
    if (!fieldmappingkeys.userDefinedFields) {
        fieldmappingkeys.userDefinedFields = {};
    }

    // Customize field mapping keys of cyrious - create API request.
    for (const property in fieldmappingkeys) {
        // console.log('property:==', property);

        if (property.startsWith("estimate.")) {
            const key = property.split(".")[1];
            if (key === "StoreID") {
                fieldmappingkeys.estimate.StoreID = '-1';
            } else if (key === "ClassTypeID") {
                fieldmappingkeys.estimate.ClassTypeID = "10000";
            }
            else if (key === "SalesPerson1ID") {
                fieldmappingkeys.estimate.SalesPerson1ID = "-1";
            } 
            else {
                fieldmappingkeys.estimate[key] = fieldmappingkeys[property];
            }
        } else if (property.startsWith("userDefinedFields[")) {
            const fieldName = property.match(/\[(.*?)\]/)[1];
            if (fieldName === "ID") {
                fieldmappingkeys.userDefinedFields["[ID]"] = '';
            } else if (fieldName === "StoreID") {
                fieldmappingkeys.userDefinedFields["[StoreID]"] = "-1";
            } else if (fieldName === "ClassTypeID") {
                fieldmappingkeys.userDefinedFields["[ClassTypeID]"] = '10000';
            } else if (fieldName === "WO NTE Limit") {
                fieldmappingkeys.userDefinedFields["[WO NTE Limit]"] = "0.00";
            } else if (fieldName === "WO Corrigo Accept 2F Reject Date") {
                fieldmappingkeys.userDefinedFields["[WO Corrigo Accept 2F Reject Date]"] = "";
            } else if (fieldName === "WO Corrigo Web Link") {
                fieldmappingkeys.userDefinedFields["[WO Corrigo Web Link]"] = "www.google.com";
            } else if (fieldName === "1 QSP Job Type") {
                fieldmappingkeys.userDefinedFields["[1 QSP Job Type]"] = "Corrigo-JLL-Admin";
            } else {
                fieldmappingkeys.userDefinedFields[`[${fieldName}]`] = fieldmappingkeys[property];
            }
        }
    }

    // Remove the root-level properties that were added
    for (const property in fieldmappingkeys) {
        if (property.startsWith("estimate.") || property.startsWith("userDefinedFields[")) {
            delete fieldmappingkeys[property];
        }
    }
    return fieldmappingkeys;
}
        
/**
 * 
 * @param {*} fieldmappingkeys 
 * @param {*} CPDWorkOrderStatus is used to change the status key of DF as per the CPD work order status.
 * @param {*} WorkType 
 * @returns updated fieldmappingkeys
 */

const getWorkOrderStatusFieldMappingkeys = async (integrationFieldMappingkeys, CPDWorkOrderStatus, IntegrationStatusMappingKeys) => {
    integrationFieldMappingkeys.estimate.StatusText = Object.keys(IntegrationStatusMappingKeys).find(key => IntegrationStatusMappingKeys[key] === CPDWorkOrderStatus) || "Open";
    return integrationFieldMappingkeys;
}

/**
 * 
 * @param {*} integrationObject getting the field mapping record object from the scheduler controller.
 * Find the Work order from the CPDWorkOrderModel using integraton id and account id.
 * Then map the fieldmapping keys which are matched with the CPD Work orders.
 * Post the work order to the cyrious.
 * Get the work order details using the id from the post request.
 * Save the record which work order pushed to the cyrious.
 * Then update the status of CPD work order as completed once successfully pushed the code to cyrious. 
 * If we encountered any error while post or get the work order to the cyrious. We have integrations exceptions log which stores the error log for specific work order.
 * Also update the cyrious work orders when the status of CPD work order changed.
 */

exports.CYSCreateWorkorders = async (integrationFieldObject, typeOfCron) => {
    if (integrationFieldObject !== undefined) {
        let fieldmappingkeys = {}
        let workOrderPushedCount = 0
        for (let integrationObject of integrationFieldObject) {
            // find initiated count of WO to push to DF. 
            const CPDWorkOrderDetails = await CPDWorkordersModel.find({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId, status: "initiated" }).lean();
            
            if (integrationObject.serviceMethod === "create") {
                
                // Now loop the CPDWO and then push to DF by API.
                for (let workOrder of CPDWorkOrderDetails) {
                    fieldmappingkeys = integrationObject.dataPoints

                    const getWorkOrderStatusDefaultMappingKeys = await integrationsSettingsModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId })

                    // Find list of DF credentails (encrypted) & then decrypt. 
                    let serviceProviderCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "CYS" });
                    let credentailsObj = { iv: process.env.CRYPTO_IV, encryptedData: serviceProviderCredentials.credentials };
                    let decryptConfigCredentials = JSON.parse(await decryptData(credentailsObj, process.env.CRYPTO_KEY))

                    // Find integration credentails and then decrypt and pull CPD calls.
                    let CPDAuthCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "CPD" })
                    let encryptedDetails = { iv: process.env.CRYPTO_IV, encryptedData: CPDAuthCredentials.credentials };
                    let CPDdecryptConfigCredentials = JSON.parse(await decryptData(encryptedDetails, process.env.CRYPTO_KEY));
                    const corrigoToken = await CPDAuthentication(CPDdecryptConfigCredentials.client_id, CPDdecryptConfigCredentials.client_secret, CPDdecryptConfigCredentials.grant_type, CPDdecryptConfigCredentials.baseUrl);
                    fieldmappingkeys = await getCPDFieldMappingkeys(workOrder.CPDWorkOrderId, workOrder.MessageId, fieldmappingkeys, corrigoToken, integrationObject, workOrder.CPDWorkOrders.WorkOrderNumber, "")

                    fieldmappingkeys = await getDefaultFieldMappingKeys(fieldmappingkeys)
                    fieldmappingkeys = await getWorkOrderStatusFieldMappingkeys(fieldmappingkeys, workOrder.CPDWorkOrderStatus, getWorkOrderStatusDefaultMappingKeys.statusFieldMappingKeys)

                    console.log('CYS-Create-fieldmappingkeys:===',fieldmappingkeys)
                    // return 'done'

                    let CYSWorkorderListId = '';
                    let createWorkOrderConfig = {
                        method: 'post',
                        url: `${configurations.CYS.createWorkOrder.URL}`,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        data: JSON.stringify(fieldmappingkeys)
                    };

                    CYSWorkorderListId = await axios.request(createWorkOrderConfig)
                        .then((response) => {
                            console.log("created CYSWO ID:===", response.data);
                            return response.data.data.id
                        })
                        .catch(async (error) => {
                            console.log("ERRORSS create CYS:==", error.response.data);
                            await exceptionLogs(integrationObject, error.response.status, error.message, JSON.stringify(error.response.data.message), JSON.stringify(error.config.data), "cys-create-workorder", workOrder.CPDWorkOrderId, workOrder.CPDWorkOrders.WorkOrderNumber, "")
                            
                        });
                    console.log("CYSWorkorderListId:===", CYSWorkorderListId);
                    if (CYSWorkorderListId !== undefined) {
                        let getWorkOrderConfig = {
                            method: 'get',
                            url: `${configurations.CYS.getWorkOrder.URL}/${CYSWorkorderListId}`,
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        };
                        const getCYSWorkOrderList = await axios.request(getWorkOrderConfig)
                            .then((response) => {
                                // console.log("getCYSWorkOrderList:===", response.data.data);
                                return response.data.data
                            })
                            .catch(async (error) => {
                                console.log("Create Get ERROR:==", error);
                                await exceptionLogs(integrationObject, error.response.status, error.message, JSON.stringify(error.response.data), JSON.stringify(error.config.url+" \n data: No data available"), "cys-get-workorder", workOrder.CPDWorkOrderId, workOrder.CPDWorkOrders.WorkOrderNumber, CYSWorkorderListId)
                            });
                        if (getCYSWorkOrderList) {
                            const listOfDFWorkorderDetails = await CYSWorkordersModel.findOne({ CYSWorkOrderId: CYSWorkorderListId}).lean();
                            if (listOfDFWorkorderDetails) {
                                await CYSWorkordersModel.findOneAndUpdate({
                                    CYSWorkOrderId: CYSWorkorderListId, integrationsMasterId: integrationObject.integrationsMasterId,
                                    accountId: integrationObject.accountId,
                                }, { CYSWorkOrderStatus: getCYSWorkOrderList.estimate.StatusText, status: "completed", CYSWorkOrders: getCYSWorkOrderList }, { new: true }).lean()
                            }
                            else {
                                const CYSWorkOrderDetails = await CYSWorkordersModel.create({
                                    integrationsMasterId: integrationObject.integrationsMasterId,
                                    accountId: integrationObject.accountId,
                                    integrationsCronId: workOrder.integrationsCronId,
                                    CYSWorkOrderId: CYSWorkorderListId,
                                    CYSWorkOrders: getCYSWorkOrderList,
                                    CYSWorkOrderStatus: getCYSWorkOrderList.estimate.StatusText,
                                    status: "completed",
                                });
                                await CPDWorkordersModel.findOneAndUpdate({ CPDWorkOrderId: workOrder.CPDWorkOrderId, integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId }, { status: "completed" }, { new: true })
                                workOrderPushedCount++
                                await integrationsCronsModel.findByIdAndUpdate(workOrder.integrationsCronId, { pushedCount: workOrderPushedCount }, { new: true });
                                // insert work order life cycle.
                                await workOrderLifeCycleModel.create({
                                    workOrderId: CYSWorkorderListId,
                                    workOrderStatus: getCYSWorkOrderList.estimate.StatusText,
                                    accountId: integrationObject.accountId,
                                    integrationsMasterId: integrationObject.integrationsMasterId,
                                    serviceProvider: "CYS",
                                    date_created: new Date()
                                });
                            }
                        }
                    }
                }
                    
            }
            else if (integrationObject.serviceMethod === "update") {

                // Update work orders to the Cyrious.
                const updateRequestCYSWorkorders = await CYSWorkordersModel.find({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId, status: "update-request" })
                
                for (let CYSWorkOrder of updateRequestCYSWorkorders) {
                    fieldmappingkeys = integrationObject.dataPoints
                    const getCPDWorkOrderStatus = await CPDWorkordersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId, CPDWorkOrderId: CYSWorkOrder.CYSWorkOrders.estimate.PONumber })
                    const getWorkOrderStatusDefaultMappingKeys = await integrationsSettingsModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId })

                    // Find list of CYS credentails (encrypted) & then decrypt. 
                    let serviceProviderCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "CYS" });
                    let credentailsObj = { iv: process.env.CRYPTO_IV, encryptedData: serviceProviderCredentials.credentials };
                    let decryptConfigCredentials = JSON.parse(await decryptData(credentailsObj, process.env.CRYPTO_KEY))

                    // Find integration credentails and then decrypt and pull CPD calls.
                    let CPDAuthCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "CPD" })
                    let encryptedDetails = { iv: process.env.CRYPTO_IV, encryptedData: CPDAuthCredentials.credentials };
                    let CPDdecryptConfigCredentials = JSON.parse(await decryptData(encryptedDetails, process.env.CRYPTO_KEY));
                    const corrigoToken = await CPDAuthentication(CPDdecryptConfigCredentials.client_id, CPDdecryptConfigCredentials.client_secret, CPDdecryptConfigCredentials.grant_type, CPDdecryptConfigCredentials.baseUrl);
                    fieldmappingkeys = await getCPDFieldMappingkeys(getCPDWorkOrderStatus.CPDWorkOrderId, getCPDWorkOrderStatus.MessageId, fieldmappingkeys, corrigoToken, integrationObject, getCPDWorkOrderStatus.CPDWorkOrders.WorkOrderNumber, CYSWorkOrder.CYSWorkOrderId)

                    fieldmappingkeys = await getDefaultFieldMappingKeys(fieldmappingkeys)
                    fieldmappingkeys = await getWorkOrderStatusFieldMappingkeys(fieldmappingkeys, getCPDWorkOrderStatus.CPDWorkOrderStatus, getWorkOrderStatusDefaultMappingKeys.statusFieldMappingKeys)
                    delete fieldmappingkeys.estimate.CompanyName;
                    console.log('Updatefieldmappingkeys:===',fieldmappingkeys);
                    
                    let updateWorkOrderConfig = {
                        method: 'Patch',
                        url: `${configurations.CYS.updateWorkOrder.URL}/${CYSWorkOrder.CYSWorkOrderId}`,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        data: JSON.stringify(fieldmappingkeys)
                    }
                    const CYSUpdatedWorkOrderId = await axios.request(updateWorkOrderConfig)
                        .then((response) => {
                            console.log("CYSUpdateWorkorderListresponse:===", response.data.data.id);
                            return response.data.data.id
                        })
                        .catch(async (error) => {
                            console.log("UpdateCYSERROR:==", error);
                            await exceptionLogs(integrationObject, error.response.status, error.message, JSON.stringify(error.response.data.message), JSON.stringify(error.config.data), "cys-update-workorder", getCPDWorkOrderStatus.CPDWorkOrderId, getCPDWorkOrderStatus.CPDWorkOrders.WorkOrderNumber, CYSWorkOrder.CYSWorkOrderId)
                        });
                        console.log('CYSUpdatedWorkOrderId:==',CYSUpdatedWorkOrderId)
                    let getWorkOrderConfig = {
                        method: 'get',                        
                        url: `${configurations.CYS.getWorkOrder.URL}/${CYSUpdatedWorkOrderId}`,
                        headers: {
                            'Content-Type': 'application/json',
                        }                       
                    };
                    const getCYSWorkOrderList = await axios.request(getWorkOrderConfig)
                        .then((response) => {
                            return response.data
                        })
                        .catch(async (error) => {
                            console.log("CYS Update Get ERROR:==", error.response.data);
                            await exceptionLogs(integrationObject, error.response.status, error.message, JSON.stringify(error.response.data), JSON.stringify(error.config.url+" \n data: No data available"), "cys-get-workorder", getCPDWorkOrderStatus.CPDWorkOrderId, getCPDWorkOrderStatus.CPDWorkOrders.WorkOrderNumber, CYSWorkOrder.CYSWorkOrderId)
                        });
                        // console.log('getCYSWorkOrderList:==',getCYSWorkOrderList)
                    if (getCYSWorkOrderList !== undefined) {
                        const listOfDFWorkorderDetails = await CYSWorkordersModel.findOne({ CYSWorkOrderId: CYSUpdatedWorkOrderId }).lean();
                        if (listOfDFWorkorderDetails) {
                            await CYSWorkordersModel.findOneAndUpdate({
                                CYSWorkOrderId: CYSWorkOrder.CYSWorkOrderId, integrationsMasterId: integrationObject.integrationsMasterId,
                                accountId: integrationObject.accountId,
                            }, {
                                CYSWorkOrders: getCYSWorkOrderList.data,
                                CYSWorkOrderStatus: getCYSWorkOrderList.data.estimate.StatusText,
                                status: "completed"
                            }, { new: true }).lean()

                            // insert work order life cycle.
                            await workOrderLifeCycleModel.create({
                                workOrderId: CYSWorkOrder.CYSWorkOrderId,
                                WorkOrderNumber:getCPDWorkOrderStatus.CPDWorkOrders.WorkOrderNumber,
                                workOrderStatus: getCYSWorkOrderList.data.estimate.StatusText,
                                accountId: integrationObject.accountId,
                                integrationsMasterId: integrationObject.integrationsMasterId,
                                serviceProvider: "CYS",
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
};