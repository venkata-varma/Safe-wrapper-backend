
const DFConfigurations = require('../config/integrationsConfiguration')
const axios = require('axios');
const CPDWorkordersModel = require('../models/workOrdersModels/CPDWorkordersModel');
const DFWorkOrdersModel = require('../models/workOrdersModels/DFWorkOrdersModel');
const integrationsExceptionsModel = require('../models/integrationsMasterModels/integrationsExceptionsModel');
const integrationsCronsModel = require('../models/integrationsMasterModels/integrationsCronsModel');
const asyncWrapper = require('./asyncWrapper');
const integrationsMasterServiceProvidersModel = require('../models/integrationsMasterModels/integrationsMasterServiceProvidersModel');
const { decryptData } = require('../utils/encryptionAlgorithms');
const { CPDAuthentication } = require('../utils/serviceProvidersAuthentication');
const workOrderLifeCycleModel = require('../models/workOrdersModels/workOrderLifeCycleModel');
const configurations = require('../config/integrationsConfiguration');
const CYSWorkordersModel = require('../models/workOrdersModels/CYSWorkordersModel');

/**
 * 
 * This function is used to map the buildingId which gets from the individual work order details of CPD API.
 * If encounters any error during the service call it creates an exception.
 * @returns updated fieldmappingkeys
 */

const getCPDFieldMappingkeys = async (CPDWorkOrderId, MessageId, fieldmappingkeys, corrigoToken, integrationObject) => {

    let getCPDWorkOrderDetails = await axios.get(`${configurations.CPD.getWorkOrder.URL}messageId=${MessageId}&ids=${CPDWorkOrderId}`,
        {
            headers: { Authorization: `bearer ${corrigoToken}` }
        })
        .then(res => {
            // console.log('response:==',res.data)
            return res.data.WorkOrders[0]
        })
        .catch(async (error) => {
            console.log("ERROR:==", error)
            await integrationsExceptionsModel.create({
                integrationsMasterId: integrationObject.integrationsMasterId,
                accountId: integrationObject.accountId,
                networkCode: error.response.status,
                exceptionMessage: error.response.data.Message,
                exceptionTitle: error.name,
                integrationsApiServices: 'get-workorder'
            })
        });
    if (getCPDWorkOrderDetails) {
        fieldmappingkeys.estimate.PONumber = getCPDWorkOrderDetails.WorkOrderId;
        fieldmappingkeys.userDefinedFields["[WorkOrderID]"] = getCPDWorkOrderDetails.WorkOrderId;
        fieldmappingkeys.userDefinedFields["[BE]"] = getCPDWorkOrderDetails.WorkOrderId;
        fieldmappingkeys.userDefinedFields["[Project]"] = getCPDWorkOrderDetails.WorkOrderId;
        fieldmappingkeys.userDefinedFields["[WO Corrigo On Site By]"] = getCPDWorkOrderDetails.Sla.OnSiteBy === null ? "" : getCPDWorkOrderDetails.Sla.OnSiteBy;
        fieldmappingkeys.userDefinedFields["[WO Corrigo Completion Due Date]"] = getCPDWorkOrderDetails.Sla.DueDate;
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
        console.log('property:==', property);

        if (property.startsWith("estimate.")) {
            const key = property.split(".")[1];
            if (key === "StoreId") {
                fieldmappingkeys.estimate.StoreId = '-1';
            } else if (key === "ClassTypeID") {
                fieldmappingkeys.estimate.ClassTypeID = "10000";
            } else if (key === "description") {
                fieldmappingkeys.estimate.description = "DevRabbit Testing WorkOrders (Ignore).";
            } else if (key === "SalesPerson1ID") {
                fieldmappingkeys.estimate.SalesPerson1ID = "-1";
            } else {
                fieldmappingkeys.estimate[key] = fieldmappingkeys[property];
            }
        } else if (property.startsWith("userDefinedFields[")) {
            const fieldName = property.match(/\[(.*?)\]/)[1];
            if (fieldName === "ID") {
                fieldmappingkeys.userDefinedFields["[ID]"] = '';
            } else if (fieldName === "StoreId") {
                fieldmappingkeys.userDefinedFields["[StoreId]"] = "-1";
            } else if (fieldName === "ClassTypeID") {
                fieldmappingkeys.userDefinedFields["[ClassTypeID]"] = '10000';
            } else if (fieldName === "WO NTE Limit") {
                fieldmappingkeys.userDefinedFields["[WO NTE Limit]"] = "0.00";
            } else if (fieldName === "WO Corrigo Accept 2F Reject Date") {
                fieldmappingkeys.userDefinedFields["[WO Corrigo Accept 2F Reject Date]"] = "";
            } else if (fieldName === "WO Corrigo Web Link") {
                fieldmappingkeys.userDefinedFields["[WO Corrigo Web Link]"] = "DevRabbit Testing WorkOrders (Ignore).";
            } else if (fieldName === "1 QSP Job Type") {
                fieldmappingkeys.userDefinedFields["[1 QSP Job Type]"] = "Corrigo-JLL-Admin";
            } else {
                fieldmappingkeys.userDefinedFields[`[${fieldName}]`] = "";
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

const getWorkOrderFieldMappingkeys = async (fieldmappingkeys, WorkOrderNumber, CPDWorkOrderStatus, WorkType) => {
    
        if (CPDWorkOrderStatus === "New") {
            fieldmappingkeys.estimate.StatusText = 'Requested';
        }
        else if (CPDWorkOrderStatus === "Accepted") {
            fieldmappingkeys.estimate.StatusText = 'Approved';
        }
        else if (CPDWorkOrderStatus === "CheckedIn") {
            fieldmappingkeys.estimate.StatusText = 'Built';
        }
        else if (CPDWorkOrderStatus === "CheckedOut") {
            fieldmappingkeys.estimate.StatusText = 'Closed';
        }
        else if (CPDWorkOrderStatus === "OnHold") {
            fieldmappingkeys.estimate.StatusText = 'Pending';
        }
        else if (CPDWorkOrderStatus === "Rejected") {
            fieldmappingkeys.estimate.StatusText = 'Cancelled';
        }
    
    return fieldmappingkeys
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
                fieldmappingkeys = await getDefaultFieldMappingKeys(integrationObject.dataPoints)
                
                // Now loop the CPDWO and then push to DF by API.
                for (let workOrder of CPDWorkOrderDetails) {
                    fieldmappingkeys = await getWorkOrderFieldMappingkeys(fieldmappingkeys, workOrder.CPDWorkOrders.WorkOrderNumber, workOrder.CPDWorkOrderStatus, workOrder.CPDWorkOrders.WorkType)

                    // Find list of DF credentails (encrypted) & then decrypt. 
                    let serviceProviderCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "CYS" });
                    let credentailsObj = { iv: process.env.CRYPTO_IV, encryptedData: serviceProviderCredentials.credentials };
                    let decryptConfigCredentials = JSON.parse(await decryptData(credentailsObj, process.env.CRYPTO_KEY))

                    // Find integration credentails and then decrypt and pull CPD calls.
                    let CPDAuthCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "CPD" })
                    let encryptedDetails = { iv: process.env.CRYPTO_IV, encryptedData: CPDAuthCredentials.credentials };
                    let CPDdecryptConfigCredentials = JSON.parse(await decryptData(encryptedDetails, process.env.CRYPTO_KEY));
                    const corrigoToken = await CPDAuthentication(CPDdecryptConfigCredentials.client_id, CPDdecryptConfigCredentials.client_secret, CPDdecryptConfigCredentials.grant_type, CPDdecryptConfigCredentials.baseUrl);
                    let CPDFieldMappingkeys = await getCPDFieldMappingkeys(workOrder.CPDWorkOrderId, workOrder.MessageId, fieldmappingkeys, corrigoToken, integrationObject)
                    console.log('fieldmappingkeys:===',fieldmappingkeys)
                    

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
                            await integrationsExceptionsModel.create({
                                integrationsMasterId: integrationObject.integrationsMasterId,
                                accountId: integrationObject.accountId,
                                CPDWorkOrderId: workOrder.CPDWorkOrderId,
                                networkCode: error.response.status,
                                exceptionMessage: error.message,
                                exceptionTitle: JSON.stringify(error.response.data.message),
                                integrationsApiServices: 'create-workorder'
                            });
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
                                console.log("getCYSWorkOrderList:===", response.data.data);
                                return response.data.data
                            })
                            .catch(async (error) => {
                                console.log("Create Get ERROR:==", error);
                                await integrationsExceptionsModel.create({
                                    integrationsMasterId: integrationObject.integrationsMasterId,
                                    accountId: integrationObject.accountId,
                                    CPDWorkOrderId: workOrder.CPDWorkOrderId,
                                    networkCode: error.response.status,
                                    exceptionMessage: error.message,
                                    exceptionTitle: JSON.stringify(error.response.data.message),
                                    integrationsApiServices: 'get-workorder'
                                })
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
                                workOrderPushedCount++
                                await CPDWorkordersModel.findOneAndUpdate({ CPDWorkOrderId: workOrder.CPDWorkOrderId, integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId }, { status: "completed" }, { new: true })
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
            else{
                // nothing
            }
            
               /*
            else if (integrationObject.serviceMethod === "update") {
                fieldmappingkeys = await getDefaultFieldMappingKeys(integrationObject.dataPoints)

                // Update work orders to the Dataforma.
                const updateRequestDFWorkorders = await DFWorkOrdersModel.find({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId, status: "update-request" })

                for (let DFWorkOrder of updateRequestDFWorkorders) {
                    const getCPDWorkOrderStatus = await CPDWorkordersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId, "CPDWorkOrders.WorkOrderNumber": DFWorkOrder.DFWorkOrders.numberAlt })
                    fieldmappingkeys = await getWorkOrderFieldMappingkeys(fieldmappingkeys, getCPDWorkOrderStatus.CPDWorkOrders.WorkOrderNumber, getCPDWorkOrderStatus.CPDWorkOrderStatus, getCPDWorkOrderStatus.CPDWorkOrders.WorkType)

                    // Find integration credentails and then decrypt and pull CPD calls.
                    let CPDAuthCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "CPD" })
                    let encryptedDetails = { iv: process.env.CRYPTO_IV, encryptedData: CPDAuthCredentials.credentials };
                    let CPDdecryptConfigCredentials = JSON.parse(await decryptData(encryptedDetails, process.env.CRYPTO_KEY));
                    const corrigoToken = await CPDAuthentication(CPDdecryptConfigCredentials.client_id, CPDdecryptConfigCredentials.client_secret, CPDdecryptConfigCredentials.grant_type, CPDdecryptConfigCredentials.baseUrl);
                    let CPDFieldMappingkeys = await getCPDFieldMappingkeys(getCPDWorkOrderStatus.CPDWorkOrderId, getCPDWorkOrderStatus.MessageId, fieldmappingkeys, corrigoToken, integrationObject)


                    fieldmappingkeys.statusDate = new Date().toJSON()
                    let serviceProviderCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "DF" });
                    let encrypted = { iv: process.env.CRYPTO_IV, encryptedData: serviceProviderCredentials.credentials };
                    // console.log("Step-1 called");

                    let decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY))
                    // Find and map the typeListId value
                    let mappingKeys = await getDFTypeListIdFromSearchAPI(fieldmappingkeys, decryptConfigCredentials, getCPDWorkOrderStatus.CPDWorkOrders.Type, integrationObject)
                    // console.log('fieldmappingkeys:===',fieldmappingkeys)
                    let DFWorkorderList = {}
                    let DFWorkOrderId
                    let updateWorkOrderConfig = {
                        method: 'put',
                        maxBodyLength: Infinity,
                        url: `${DFConfigurations.DF.updateWorkOrder.URL}${DFWorkOrder.DFWorkOrderId}`,
                        headers: {
                            'df-auth': decryptConfigCredentials.df_auth,
                            'df-servicecode': decryptConfigCredentials.df_servicecode,
                            'Content-Type': 'application/json',
                        },
                        data: JSON.stringify(fieldmappingkeys)
                    }
                    await axios.request(updateWorkOrderConfig)
                        .then((response) => {
                            DFWorkorderList = JSON.stringify(response.data)
                            console.log("DFUpdateWorkorderListresponse:===", JSON.stringify(response.data));
                        })
                        .catch(async (error) => {
                            console.log("UpdateERROR:==", JSON.stringify(error.response.data));
                            await integrationsExceptionsModel.create({
                                integrationsMasterId: integrationObject.integrationsMasterId,
                                accountId: integrationObject.accountId,
                                CPDWorkOrderId: getCPDWorkOrderStatus.CPDWorkOrderId,
                                networkCode: error.response.status,
                                exceptionMessage: error.message,
                                exceptionTitle: JSON.stringify(error.response.data.messages),
                                integrationsApiServices: 'update-workorder'
                            })
                        });
                    let getWorkOrderConfig = {
                        method: 'get',
                        maxBodyLength: Infinity,
                        url: `${DFConfigurations.DF.getWorkOrderById.URL}${DFWorkOrder.DFWorkOrderId}`,
                        headers: {
                            'df-auth': decryptConfigCredentials.df_auth,
                            'df-servicecode': decryptConfigCredentials.df_servicecode,
                            'Content-Type': 'application/json',
                        },
                    };
                    const getDFWorkOrderList = await axios.request(getWorkOrderConfig)
                        .then((response) => {
                            DFWorkorderList = JSON.stringify(response.data)
                            // console.log("DFWorkorderListresponse:===", JSON.stringify(response.data));
                        })
                        .catch(async (error) => {
                            console.log("ERROR:==", error.response.data);
                            await integrationsExceptionsModel.create({
                                integrationsMasterId: integrationObject.integrationsMasterId,
                                accountId: integrationObject.accountId,
                                CPDWorkOrderId: getCPDWorkOrderStatus.CPDWorkOrderId,
                                networkCode: error.response.status,
                                exceptionMessage: error.message,
                                exceptionTitle: JSON.stringify(error.response.data.messages),
                                integrationsApiServices: 'get-workorder'
                            })
                        });
                    if (DFWorkorderList) {
                        DFWorkOrderId = DFWorkorderList.id
                        const listOfDFWorkorderDetails = await DFWorkOrdersModel.findOne({ DFWorkOrderId: DFWorkOrder.DFWorkOrderId }).lean();
                        if (listOfDFWorkorderDetails) {
                            let updatedDFWorkOrderStatus = JSON.parse(DFWorkorderList).status.split(' ').length > 1 ? JSON.parse(DFWorkorderList).status.split(' ').join('-') : JSON.parse(DFWorkorderList).status
                            await DFWorkOrdersModel.findOneAndUpdate({
                                DFWorkOrderId: DFWorkOrder.DFWorkOrderId, integrationsMasterId: integrationObject.integrationsMasterId,
                                accountId: integrationObject.accountId,
                            }, {
                                DFWorkOrders: JSON.parse(DFWorkorderList),
                                DFWorkOrderStatus: updatedDFWorkOrderStatus,
                                status: "completed"
                            }, { new: true }).lean()

                            // insert work order life cycle.
                            await workOrderLifeCycleModel.create({
                                workOrderId: DFWorkOrder.DFWorkOrderId,
                                workOrderStatus: updatedDFWorkOrderStatus,
                                accountId: integrationObject.accountId,
                                integrationsMasterId: integrationObject.integrationsMasterId,
                                serviceProvider: "DF",
                                date_created: new Date()
                            });
                        }
                        else {
                            //nothing
                        }
                    }
                }
            }
                */
        }
    }
};