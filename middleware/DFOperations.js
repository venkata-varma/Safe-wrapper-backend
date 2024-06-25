
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

/**
 * 
 * @param {*} fieldmappingkeys contains all mapping keys
 * @param {*} decryptConfigCredentials contains respected service auth credentials
 * @param {*} WorkType decides to typeListId
 * This function used to get the typeListId value and then return the updated fieldmapping keys
 */

const getDFTypeListIdFromSearchAPI = async (fieldmappingkeys, decryptConfigCredentials, WorkType, integrationObject) => {
    let searchTypeListId = {
        method: 'post',
        // maxBodyLength: Infinity,
        url: `${DFConfigurations.DF.searchWorkOrderType.URL}`,
        data: {},
        headers: {
            'df-auth': decryptConfigCredentials.df_auth,
            'df-servicecode': decryptConfigCredentials.df_servicecode,
            'Content-Type': 'application/json',
        }
    }
    const getTypeListIdDetails = await axios.request(searchTypeListId)
        .then((response) => {
            // console.log("getTypeListId:===", JSON.stringify(response.data));
            return response.data
        })
        .catch(async (error) => {
            console.log("ERROR:==", error);
            // await integrationsExceptionsModel.create({
            //     integrationsMasterId: integrationObject.integrationsMasterId,
            //     accountId: integrationObject.accountId,
            //     CPDWorkOrderId: getCPDWorkOrderStatus.CPDWorkOrderId,
            //     networkCode: error.response.status,
            //     exceptionMessage: error.message,
            //     exceptionTitle: error.response.data.messages || error.response.data.error,
            //     integrationsApiServices: 'update-workorder'
            // })
        });
    console.log('WorkType:==', WorkType)
    if (WorkType === "PMRM") {
        const workOrderType = getTypeListIdDetails.find((item) => item.listValue === "Preventive Maintenance");
        fieldmappingkeys.typeListId = workOrderType ? workOrderType.id : 1237;
    }
    else if (WorkType !== "PMRM") {
        const workOrderType = getTypeListIdDetails.find((item) => item.listValue === "Office & Engineering");
        fieldmappingkeys.typeListId = workOrderType ? workOrderType.id : 687;
    }
    return fieldmappingkeys;
}

/**
 * 
 * This function is used to map the buildingId which gets from the individual work order details of CPD API.
 * If encounters any error during the service call it creates an exception.
 * @returns updated fieldmappingkeys
 */

const getCPDFieldMappingkeys = async (CPDWorkOrderId, MessageId, fieldmappingkeys, corrigoToken, integrationObject) => {

    let getCPDWorkOrderDetails = await axios.get(`https://am-api.corrigopro.com/Direct/api/workOrder?messageId=${MessageId}&ids=${CPDWorkOrderId}`,
        {
            headers: { Authorization: `bearer ${corrigoToken.access_token}` }
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
        fieldmappingkeys.buildingId = getCPDWorkOrderDetails.ServiceLocation.OccupantID;
        fieldmappingkeys.workDescription = getCPDWorkOrderDetails.WorkDetails.Assets[0].Comment || "DevRabbit Testing WorkOrders (Ignore).";
    }
    return fieldmappingkeys

}

/**
 * Prepare the fieldmappingkeys object as per the requirement
 */
const getDefaultFieldMappingKeys = async (fieldmappingkeys) => {
    // Customize field mapping keys of DF - create API request. 
    for (const property in fieldmappingkeys) {
        if (property === "numberAlt")
            fieldmappingkeys.numberAlt = '';

        else if (property === "budgetedProposedStatus")
            fieldmappingkeys.budgetedProposedStatus = "NONE";

        else if (property === "buildingId")
            fieldmappingkeys.buildingId = 1715;

        else if (property === "divisionId")
            fieldmappingkeys.divisionId = 1;

        else if (property === "invoiceToCustomerId")
            fieldmappingkeys.invoiceToCustomerId = 2238;

        else if (property === "invoiceType")
            fieldmappingkeys.invoiceType = 'EXTERNAL_CHARGE';

        else if (property === "reportedById")
            fieldmappingkeys.reportedById = 5515;

        else if (property === "status")
            fieldmappingkeys.status = 'IN_PROGRESS';
        else if (property === "typeListId")
            fieldmappingkeys.typeListId = 687;
        else if (property === "invoiceToText")
            fieldmappingkeys.invoiceToText = "CBRE/T-Mobile"
        else if (property === "workDescription")
            fieldmappingkeys.workDescription = "DevRabbit Testing WorkOrders (Ignore).";
        else
            fieldmappingkeys[property] = "";

    }
    return fieldmappingkeys
}

/**
 * 
 * @param {*} fieldmappingkeys 
 * @param {*} WorkOrderNumber used to assign the value to numberAlt of DF.
 * @param {*} CPDWorkOrderStatus is used to change the status key of DF as per the CPD work order status.
 * @param {*} WorkType 
 * @returns updated fieldmappingkeys
 */
const getWorkOrderFieldMappingkeys = async (fieldmappingkeys, WorkOrderNumber, CPDWorkOrderStatus, WorkType) => {
    fieldmappingkeys.numberAlt = WorkOrderNumber;
    if (CPDWorkOrderStatus === "New") {
        fieldmappingkeys.status = 'REPORTED';
    }
    else if (CPDWorkOrderStatus === "Accepted") {
        fieldmappingkeys.status = 'ESTIMATE_REQUESTED';
    }
    else if (CPDWorkOrderStatus === "CheckedIn") {
        fieldmappingkeys.status = 'SCHEDULED';
    }
    else if (CPDWorkOrderStatus === "CheckedOut") {
        fieldmappingkeys.status = 'COMPLETED';
    }
    else if (CPDWorkOrderStatus === "OnHold") {
        fieldmappingkeys.status = 'ON_HOLD';
    }
    else if (CPDWorkOrderStatus === "Rejected") {
        fieldmappingkeys.status = 'CANCELED';
    }
    else if (WorkType === "PMRM") {
        fieldmappingkeys.typeListId = 1237;
    }
    else if (WorkType !== "PMRM") {
        fieldmappingkeys.typeListId = 687;
    }
    return fieldmappingkeys
}

/**
 * 
 * @param {*} integrationObject getting the field mapping record object from the scheduler controller.
 * Find the Work order from the CPDWorkOrderModel using integraton id and account id.
 * Then map the fieldmapping keys which are matched with the CPD Work orders.
 * Post the work order to the dataforma.
 * Get the work order details using the id from the post request.
 * Save the record which work order pushed to the dataforma.
 * Then update the status of CPD work order as completed once successfully pushed the code to dataforma. 
 * If we encountered any error while post or get the work order to the dataforma. We have integrations exceptions log which stores the error log for specific work order.
 * Also update the Dataforma work orders when the status of CPD work order changed.
 */

exports.DFCreateWorkorders = async (integrationFieldObject, typeOfCron) => {
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
                    let serviceProviderCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "DF" });
                    let credentailsObj = { iv: process.env.CRYPTO_IV, encryptedData: serviceProviderCredentials.credentials };
                    let decryptConfigCredentials = JSON.parse(await decryptData(credentailsObj, process.env.CRYPTO_KEY))

                    // Find integration credentails and then decrypt and pull CPD calls.
                    let CPDAuthCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "CPD" })
                    let encryptedDetails = { iv: process.env.CRYPTO_IV, encryptedData: CPDAuthCredentials.credentials };
                    let CPDdecryptConfigCredentials = JSON.parse(await decryptData(encryptedDetails, process.env.CRYPTO_KEY));
                    const corrigoToken = await CPDAuthentication(CPDdecryptConfigCredentials.client_id, CPDdecryptConfigCredentials.client_secret, CPDdecryptConfigCredentials.grant_type, CPDdecryptConfigCredentials.baseUrl);
                    let CPDFieldMappingkeys = await getCPDFieldMappingkeys(workOrder.CPDWorkOrderId, workOrder.MessageId, fieldmappingkeys, corrigoToken, integrationObject)


                    let DFWorkOrderId; let DFWorkorderList = {};
                    let createWorkOrderConfig = {
                        method: 'post',
                        maxBodyLength: Infinity,
                        url: `${decryptConfigCredentials.baseUrl}/workorders`,
                        headers: {
                            'df-auth': decryptConfigCredentials.df_auth,
                            'df-servicecode': decryptConfigCredentials.df_servicecode,
                            'Content-Type': 'application/json',
                        },
                        data: JSON.stringify(fieldmappingkeys)
                    };

                    DFWorkOrderId = await axios.request(createWorkOrderConfig)
                        .then((response) => {
                            console.log("created DFWO ID:===", response.data.id);
                            return response.data.id
                        })
                        .catch(async (error) => {
                            console.log("ERRORSS create DF:==", error.response.data);
                            await integrationsExceptionsModel.create({
                                integrationsMasterId: integrationObject.integrationsMasterId,
                                accountId: integrationObject.accountId,
                                CPDWorkOrderId: workOrder.CPDWorkOrderId,
                                networkCode: error.response.status,
                                exceptionMessage: error.message,
                                exceptionTitle: JSON.stringify(error.response.data.messages),
                                integrationsApiServices: 'create-workorder'
                            })
                        });
                    console.log("DFWorkOrderId:===", DFWorkOrderId);
                    if (DFWorkOrderId !== undefined) {
                        let getWorkOrderConfig = {
                            method: 'get',
                            maxBodyLength: Infinity,
                            url: `${DFConfigurations.DF.getWorkOrderById.URL}${DFWorkOrderId}`,
                            headers: {
                                'df-auth': decryptConfigCredentials.df_auth,
                                'df-servicecode': decryptConfigCredentials.df_servicecode,
                                'Content-Type': 'application/json',
                            },
                        };
                        const getDFWorkOrderList = await axios.request(getWorkOrderConfig)
                            .then((response) => {
                                DFWorkorderList = JSON.stringify(response.data)
                                console.log("DFWorkorderListresponse:===", JSON.stringify(response.data));
                            })
                            .catch(async (error) => {
                                console.log("Create Get ERROR:==", error.response.data);
                                await integrationsExceptionsModel.create({
                                    integrationsMasterId: integrationObject.integrationsMasterId,
                                    accountId: integrationObject.accountId,
                                    CPDWorkOrderId: workOrder.CPDWorkOrderId,
                                    networkCode: error.response.status,
                                    exceptionMessage: error.message,
                                    exceptionTitle: JSON.stringify(error.response.data.messages),
                                    integrationsApiServices: 'get-workorder'
                                })
                            });

                        if (DFWorkorderList) {
                            DFWorkOrderId = JSON.parse(DFWorkorderList).id
                            const listOfDFWorkorderDetails = await DFWorkOrdersModel.findOne({ DFWorkOrderId: DFWorkOrderId, }).lean();
                            if (listOfDFWorkorderDetails) {
                                await DFWorkOrdersModel.findOneAndUpdate({
                                    DFWorkOrderId: DFWorkOrderId, integrationsMasterId: integrationObject.integrationsMasterId,
                                    accountId: integrationObject.accountId,
                                }, { DFWorkOrderStatus: JSON.parse(DFWorkorderList).status, status: "completed" }, { new: true }).lean()
                            }
                            else {
                                const DFWorkOrderDetails = await DFWorkOrdersModel.create({
                                    integrationsMasterId: integrationObject.integrationsMasterId,
                                    accountId: integrationObject.accountId,
                                    integrationsCronId: workOrder.integrationsCronId,
                                    DFWorkOrderId: DFWorkOrderId,
                                    DFWorkOrders: JSON.parse(DFWorkorderList),
                                    DFWorkOrderStatus: JSON.parse(DFWorkorderList).status,
                                    status: "completed",
                                });
                                workOrderPushedCount++
                                await CPDWorkordersModel.findOneAndUpdate({ CPDWorkOrderId: workOrder.CPDWorkOrderId }, { status: "completed" }, { new: true })
                                await integrationsCronsModel.findByIdAndUpdate(workOrder.integrationsCronId, { pushedCount: workOrderPushedCount }, { new: true });
                            }
                        }
                    }
                }
            }
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
                                DFWorkOrders : JSON.parse(DFWorkorderList),
                                DFWorkOrderStatus: updatedDFWorkOrderStatus,
                                status: "completed"
                            }, { new: true }).lean()
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