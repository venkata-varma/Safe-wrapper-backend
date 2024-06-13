
const DFConfigurations = require('../config/integrationsConfiguration')
const axios = require('axios');
const CPDWorkordersModel = require('../models/workOrdersModels/CPDWorkordersModel');
const DFWorkOrdersModel = require('../models/workOrdersModels/DFWorkOrdersModel');
const integrationsExceptionsModel = require('../models/integrationsMasterModels/integrationsExceptionsModel');
const integrationsCronsModel = require('../models/integrationsMasterModels/integrationsCronsModel');
const asyncWrapper = require('./asyncWrapper');
const integrationsMasterServiceProvidersModel = require('../models/integrationsMasterModels/integrationsMasterServiceProvidersModel');
const { decryptData } = require('../utils/encryptionAlgorithms');

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
 */

exports.DFCreateWorkorders = async (integrationObject, typeOfCron) => {

    if (integrationObject !== undefined) {
        let fieldmappingkeys = {}
        let workOrderPushedCount = 0
        fieldmappingkeys = integrationObject.mappedKeys.get_integration_field_mapping_master_default_keys[0].dataPoints;

        const CPDWorkOrderDetails = await CPDWorkordersModel.find({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId, status: "initiated" }).lean();

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

            else if (property === "workDescription")
                fieldmappingkeys.workDescription = "DevRabbit Testing WorkOrders (Ignore).";
            else
                fieldmappingkeys[property] = "";

        }

        for (let workOrder of CPDWorkOrderDetails) {
            fieldmappingkeys.numberAlt = workOrder.CPDWorkOrders.WorkOrderNumber;
            let serviceProviderCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "DF" });
            let encrypted = { iv: process.env.CRYPTO_IV, encryptedData: serviceProviderCredentials.credentials };
            // console.log("Step-1 called");

            let decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY))

            let DFWorkOrderId;
            let DFWorkorderList = {}
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
                    console.log("response:===", response.data.id);
                    return response.data.id
                })
                .catch(async (error) => {
                    console.log("ERRORSS:==", error.response.data);
                    await integrationsExceptionsModel.create({
                        integrationsMasterId: integrationObject.integrationsMasterId,
                        accountId: integrationObject.accountId,
                        CPDWorkOrderId: workOrder.CPDWorkOrderId,
                        networkCode: error.response.status,
                        exceptionMessage: error.message,
                        exceptionTitle: error.response.data.messages
                    })
                });
            console.log("DFWorkOrderId:===", DFWorkOrderId);

            let getWorkOrderConfig = {
                method: 'get',
                maxBodyLength: Infinity,
                url: `${DFConfigurations.DF.getWorkOrderById.URL}${DFWorkOrderId}`,
                headers: DFConfigurations.DF.getWorkOrderById.headers,
            };
            const getDFWorkOrderList = await axios.request(getWorkOrderConfig)
                .then((response) => {
                    DFWorkorderList = JSON.stringify(response.data)
                    console.log("DFWorkorderListresponse:===", JSON.stringify(response.data));
                })
                .catch(async (error) => {
                    console.log("ERROR:==", error.response.data);
                    await integrationsExceptionsModel.create({
                        integrationsMasterId: integrationObject.integrationsMasterId,
                        accountId: integrationObject.accountId,
                        CPDWorkOrderId: workOrder.CPDWorkOrderId,
                        networkCode: error.response.status,
                        exceptionMessage: error.message,
                        exceptionTitle: error.response.data.messages
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

        // Data forma work orders update.
        const updateRequestDFWorkorders = await DFWorkOrdersModel.find({integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId, status: "update-request"})

        for(let DFWorkOrder of updateRequestDFWorkorders){
            const getCPDWorkOrderStatus = await CPDWorkordersModel.findOne({integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId, "CPDWorkOrders.WorkOrderNumber":DFWorkOrder.DFWorkOrders.numberAlt})
            fieldmappingkeys.numberAlt = getCPDWorkOrderStatus.CPDWorkOrders.WorkOrderNumber;
            if(getCPDWorkOrderStatus.CPDWorkOrderStatus === "New"){
                fieldmappingkeys.status = 'IN_PROGRESS';
            }
            else if(getCPDWorkOrderStatus.CPDWorkOrderStatus === "Accepted"){
                fieldmappingkeys.status = 'ESTIMATE_REQUESTED';
            }
            else if(getCPDWorkOrderStatus.CPDWorkOrderStatus === "CheckedIn"){
                fieldmappingkeys.status = 'SCHEDULED';
            }
            else if(getCPDWorkOrderStatus.CPDWorkOrderStatus === "CheckedOut"){
                fieldmappingkeys.status = 'COMPLETED';
            }
            else if(getCPDWorkOrderStatus.CPDWorkOrderStatus === "OnHold"){
                fieldmappingkeys.status = 'ON_HOLD';
            }
            else if(getCPDWorkOrderStatus.CPDWorkOrderStatus === "Rejected"){
                fieldmappingkeys.status = 'CANCELED';
            }
            fieldmappingkeys.statusDate = new Date().toTimeString()
        console.log('fieldmappingkeys:===',fieldmappingkeys)

        // let updateWorkOrderConfig = {
        //     method: 'put',
        //     maxBodyLength: Infinity,
        //     url: `${DFConfigurations.DF.updateWorkOrder.URL}${DFWorkOrderId}`,
        //     headers: {
        //         'df-auth': decryptConfigCredentials.df_auth,
        //         'df-servicecode': decryptConfigCredentials.df_servicecode,
        //         'Content-Type': 'application/json',
        //     },
        //     data: JSON.stringify(fieldmappingkeys)
        // }
        // await axios.request(updateWorkOrderConfig)
        //     .then((response) => {
        //         // DFWorkorderList = JSON.stringify(response.data)
        //         console.log("DFWorkorderListresponse:===", JSON.stringify(response.data));
        //     })
        //     .catch(async (error) => {
        //         console.log("ERROR:==", error.response.data);
        //         await integrationsExceptionsModel.create({
        //             integrationsMasterId: integrationObject.integrationsMasterId,
        //             accountId: integrationObject.accountId,
        //             CPDWorkOrderId: workOrder.CPDWorkOrderId,
        //             networkCode: error.response.status,
        //             exceptionMessage: error.message,
        //             exceptionTitle: error.response.data.messages
        //         })
        //     });
        
        }
    }
};