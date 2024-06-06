
const DFConfigurations = require('../config/integrationsConfiguration')
const axios = require('axios');
const CPDWorkordersModel = require('../models/workOrdersModels/CPDWorkordersModel');
const DFWorkOrdersModel = require('../models/workOrdersModels/DFWorkOrdersModel');
const integrationsExceptionsModel = require('../models/integrationsMasterModels/integrationsExceptionsModel');
const integrationsCronsModel = require('../models/integrationsMasterModels/integrationsCronsModel');
const asyncWrapper = require('./asyncWrapper');

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

exports.DFCreateWorkorders = asyncWrapper(async (integrationObject) => {

    if (integrationObject !== undefined) {
        let fieldmappingkeys = {}
        let workOrderPushedCount = 0
        fieldmappingkeys = integrationObject.mappedKeys;

        const CPDWorkOrderDetails = await CPDWorkordersModel.find({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId, status: "initiated" }).limit(1).lean();
        for (const property in fieldmappingkeys) {

            if (property === "numberAlt")
                fieldmappingkeys.numberAlt = CPDWorkOrderDetails[0].CPDWorkOrders.WorkOrderNumber;

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
        let DFWorkOrderId = 0, DFWorkorderList = {}
        let createWorkOrderConfig = {
            method: 'post',
            maxBodyLength: Infinity,
            url: DFConfigurations.DF.createWorkOrder.URL,
            headers: DFConfigurations.DF.createWorkOrder.headers,
            data: JSON.stringify(fieldmappingkeys)
        };
        // axios.request(createWorkOrderConfig)
        //     .then((response) => {
        //         DFWorkOrderId = response.data.id
        //         console.log("response:===",JSON.stringify(response.data));
        //     })
        //     .catch((error) => {
        //         console.log("ERROR:==",error.response.data);
        //         await integrationsExceptionsModel.create({
        //         integrationsMasterId: integrationObject.integrationsMasterId,
        //         accountId: integrationObject.accountId,
        //         CPDWorkOrderId : CPDWorkOrderDetails[0].CPDWorkOrderId,
        //         networkCode : error.response.status,
        //         exceptionMessage : error.message,
        //         exceptionTitle : error.response.data.messages[0]
        //         })
        //     });

        let getWorkOrderConfig = {
            method: 'get',
            maxBodyLength: Infinity,
            url: `${DFConfigurations.DF.getWorkOrderById.URL}${31371}`,
            headers: DFConfigurations.DF.getWorkOrderById.headers,
        };
        const getDFWorkOrderList = await axios.request(getWorkOrderConfig)
            .then((response) => {
                DFWorkorderList = JSON.stringify(response.data)
                // console.log("response:===", JSON.stringify(response.data));
            })
            .catch(async (error) => {
                console.log("ERROR:==", error.response.data);
                await integrationsExceptionsModel.create({
                    integrationsMasterId: integrationObject.integrationsMasterId,
                    accountId: integrationObject.accountId,
                    CPDWorkOrderId: CPDWorkOrderDetails[0].CPDWorkOrderId,
                    networkCode: error.response.status,
                    exceptionMessage: error.message,
                    exceptionTitle: error.response.data.messages[0]
                })
            });
        DFWorkOrderId = JSON.parse(DFWorkorderList).id
        const listOfDFWorkorderDetails = await DFWorkOrdersModel.findOne({ DFWorkOrderId: 31371, }).lean();
        // console.log('listOfDFWorkorderDetails:===', listOfDFWorkorderDetails)
        if (listOfDFWorkorderDetails) {
            DFWorkOrdersModel.findOneAndUpdate({
                DFWorkOrderId: DFWorkOrderId, integrationsMasterId: integrationObject.integrationsMasterId,
                accountId: integrationObject.accountId
            }, { status: "completed" }, { new: true }).lean()
        }
        else {
            const DFWorkOrderDetails = await DFWorkOrdersModel.create({
                integrationsMasterId: integrationObject.integrationsMasterId,
                accountId: integrationObject.accountId,
                integrationsCronId: CPDWorkOrderDetails[0].integrationsCronId,
                DFWorkOrderId: DFWorkOrderId,
                DFWorkOrders: DFWorkorderList,
                DFWorkOrderStatus: JSON.parse(DFWorkorderList).status,
                status: "completed",
            });
            workOrderPushedCount++
            await CPDWorkordersModel.findOneAndUpdate({ CPDWorkOrderId: CPDWorkOrderDetails[0].CPDWorkOrderId }, { status: "completed" }, { new: true })
            await integrationsCronsModel.findByIdAndUpdate(CPDWorkOrderDetails[0].integrationsCronId, { pushedCount: workOrderPushedCount }, { new: true });
        }

    }
});