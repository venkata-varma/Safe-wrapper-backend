
const integrationsScheduleCronJobs = require("../customer/controllers/schedulerController");
const integrationsCronJobsModel = require('../models/integrationsCronsModel')
const axios = require('axios');
const moment = require('moment')
const { decryptData } = require("../utils/encryptionAlgorithms");
const CPDWorkordersModel = require("../models/CPDWorkordersModel");
const CPDConfigurations = require('../config/integrationsConfiguration')
const asyncWrapper = require("./asyncWrapper");
const integrationsMasterModel = require("../models/integrationsMasterModel");
const DFWorkOrdersModel = require("../models/DFWorkOrdersModel");
const integrationsExceptionsModel = require("../models/integrationsExceptionsModel");
const integrationsSettingsModel = require("../models/integrationsSettingsModel");
const { default: mongoose } = require("mongoose");
const workOrderLifeCycleModel = require("../models/workOrderLifeCycleModel");
const { exceptionLogs } = require("./exceptionOperation");
const CYSWorkordersModel = require("../models/CYSWorkordersModel");
const SNOWWorkOrdersModel = require("../models/SNOWWorkOrdersModel");
const { WOSearchByStatuses } = require("./getCPDWorkOrdersConditional");
const conditionalModel = require("../models/conditionalModel");
const { ApplyConditions } = require("../utils/conditionalUtils");


/**
 * 
 * client_id, client_secret, grant_type, baseUrl required to generate the access token.
 * @returns access token
 */
const CPDAuthentication = async (client_id, client_secret, grant_type, baseUrl, integrationObject) => {
    try {
        const tokenResponse = await axios.post(
            // 'https://oauth-pro-v2.corrigo.com/OAuth/Token',
            `${baseUrl}`,
            `client_id=${client_id}&client_secret=${client_secret}&grant_type=${grant_type}`
        );
        return tokenResponse.data;
    } catch (error) {
        console.log("Error message=", error);
        await exceptionLogs(integrationObject, error.response?.status || 401, "Authorization has been denied for this request.", error.name, JSON.stringify(error.config.url + " , " + error.response.data.error || "unsupported_credentials"), 'auth-failed', CPDWorkOrderId = "", CPDWorkOrderNumber = "", runnigWorkOrderId = "")
        return 'error';
    }
};

/**
 * 
 * @param {*} cronIntegrationDetails
 * For every cron job starts, we insert record into table. 
 * @returns 
 */
const initiateCronJobs = async (cronIntegrationDetails, typeOfCron) => {
    const cronDetails = await integrationsCronJobsModel.create(
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
 * @param {*} CPDWorkOrderResponse have the workOrders which are generated using corrigo-pro search workOrders end point.  
 * @param {*} cronJobDetails is already intiated. Here we will update the cronJob id into the CPDWorkOrderModel.
 * @param {*} accountId wil update into the CPDWorkOrderModel.
 * @param {*} integrationsMasterId wil update into the CPDWorkOrderModel.
 * then loop the CPDWorkOrderResponse which have the WorkOrders and create each workorder as individual record into the DB.
 * If a record aready exist in DB. It will update the details using WorkOrderId, accountId, integrationMasterId, status of WorkOrder which is not equal to the previous.
 * @returns number of workOrders pulled from the corrigo-pro.
 */
const validateNewAndUpdatedWO = async (CPDWorkOrderResponse, cronJobDetails, accountId, integrationsMasterId) => {
    const workDetails = {}
    const latestWorkOrderCount = {
        pullNewWorkOrdersCount: 0,
        pushNewWorkordersCount: 0,
        CPDNewWorkOrdersPulledCount: 0
    }

    for (const work of CPDWorkOrderResponse.WorkOrders) {

        workDetails.CPDWorkOrders = work;
        workDetails.MessageId = CPDWorkOrderResponse.MessageId;
        workDetails.accountId = accountId;
        workDetails.integrationsCronJobId = cronJobDetails._id

        const CPD_work_details = await CPDWorkordersModel.findOne(
            { CPDWorkOrderId: work.WorkOrderId, accountId: accountId, integrationsMasterId: integrationsMasterId });

        if (CPD_work_details) {
            // Find exactly status mismatched for existed #WO
            if (CPD_work_details.CPDWorkOrderStatus !== work.Status) {
                await CPDWorkordersModel.findOneAndUpdate({ CPDWorkOrderId: work.WorkOrderId, accountId: accountId, integrationsMasterId: integrationsMasterId }, {
                    CPDWorkOrders: workDetails.CPDWorkOrders,
                    MessageId: workDetails.MessageId,
                    CPDWorkOrderStatus: work.Status,
                }, { new: true, upsert: true });

                // insert work order life cycle.
                await workOrderLifeCycleModel.create({
                    workOrderId: work.WorkOrderId,
                    WorkOrderNumber: work.WorkOrderNumber,
                    workOrderStatus: work.Status,
                    accountId: accountId,
                    integrationsMasterId: integrationsMasterId,
                    serviceProvider: "CPD",
                    date_created: new Date()
                });

                // Update respective CPD #WO to Dataforma with status update and then process. 
                await DFWorkOrdersModel.findOneAndUpdate({ "DFWorkOrders.numberAlt": work.WorkOrderNumber, accountId: accountId, integrationsMasterId: integrationsMasterId }, {
                    status: "update-request"
                }, { new: true })
                await CYSWorkordersModel.findOneAndUpdate({ "CYSWorkOrders.estimate.PONumber": `${work.WorkOrderNumber}`, accountId: accountId, integrationsMasterId: integrationsMasterId }, {
                    status: "update-request"
                }, { new: true });
                await SNOWWorkOrdersModel.findOneAndUpdate({ "SNOWWorkOrders.user_input": `${work.WorkOrderNumber}`, accountId: accountId, integrationsMasterId: integrationsMasterId }, {
                    status: "update-request"
                }, { new: true })
            }
        } else {
            if (work.Status === "New") {
                latestWorkOrderCount.CPDNewWorkOrdersPulledCount++
            }
            let priority = work.WorkOrderNumber.includes('TMC') ? "high" : "medium";
            await CPDWorkordersModel.create({
                CPDWorkOrderId: work.WorkOrderId,
                accountId: workDetails.accountId,
                CPDBranchId: work.BranchId,
                CPDWorkOrders: workDetails.CPDWorkOrders,
                CPDWorkOrderStatus: work.Status,
                priority: priority,
                MessageId: workDetails.MessageId,
                integrationsCronId: workDetails.integrationsCronJobId,
                integrationsMasterId: integrationsMasterId
            })
            latestWorkOrderCount.pullNewWorkOrdersCount++

            // insert work order life cycle.
            await workOrderLifeCycleModel.create({
                workOrderId: work.WorkOrderId,
                WorkOrderNumber: work.WorkOrderNumber,
                workOrderStatus: work.Status,
                accountId: workDetails.accountId,
                integrationsMasterId: integrationsMasterId,
                serviceProvider: "CPD",
                date_created: new Date()
            });
        }
    }

    // Final respective updates to dependency tables. say {integrationMasterUpdate}
    await integrationsMasterModel.findByIdAndUpdate(integrationsMasterId, { lastPullDate: new Date() }, { new: true });
    return latestWorkOrderCount;
};

/**
 * 
 * @param {*} integrationObject it has the service provider credentials which are helfull to authunticate.
 * Intiate the cronJob.
 * Initially we get the service provider login credentials as String and then we will decrypt the credentials using decryptData function.
 * Then get the authorization token using CPDAuthentication.
 * Then using authorization token and workOrder search url, we will get the workorders.
 * Update the cronJob details.
 */

exports.getCPDWorkOrders = async (integrationObject, typeOfCron) => {

    let encrypted = {};
    let getCPDWorkOrderdetails;

    // Insert into cron-job
    const cronJobDetails = await initiateCronJobs({
        accountId: integrationObject.accountId,
        serviceProvider: integrationObject.serviceProvider,
        integrationsMasterId: integrationObject.integrationsMasterId
    }, typeOfCron);

    // Find integration credentails and then decrypt and pull CPD calls.
    encrypted = { iv: process.env.CRYPTO_IV, encryptedData: integrationObject.credentials };
    decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY));
    const corrigoToken = await CPDAuthentication(decryptConfigCredentials.client_id, decryptConfigCredentials.client_secret, decryptConfigCredentials.grant_type, decryptConfigCredentials.baseUrl, integrationObject);


    let fromDate, toDate
    const CPDWorkOrdersExist = await CPDWorkordersModel.find({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId });
    console.log('IDSSSSS:==', integrationObject.integrationsMasterId, integrationObject.accountId)
    const getIntegrationsSettingsDetails = await integrationsSettingsModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, accountId: integrationObject.accountId });
    const getDateRange = getIntegrationsSettingsDetails.dataDumpRange
    let getIntegrationDetails = await integrationsMasterModel.findById(integrationObject.integrationsMasterId)

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
   
    let getAllConditionsByIntegrationId = await conditionalModel.find({ integrationsMasterId: integrationObject.integrationsMasterId, status: "active" })
    let CPDWorkOrderResponse;
    if (getAllConditionsByIntegrationId.length > 0) {
        let CPDstatus = [];
        for (let condition of getAllConditionsByIntegrationId[0].conditions) {

            const getCPDWorkOrdersByConditions = await ApplyConditions(
                condition.serviceType,
                integrationObject.integrationsMasterId,
                integrationObject.accountId,
                condition,
                CPDstatus
            );
            CPDWorkOrderResponse = getCPDWorkOrdersByConditions.getWO
            // If the serviceType is "status", store the CPDstatus for subsequent use
            if (condition.serviceType === "status") {
                CPDstatus = getCPDWorkOrdersByConditions.updatedCPDstatus;  // Preserve CPDstatus from the "status" condition
            }
        }
    }
    else{
        // Get work orders from the CPD - API calls.
        CPDWorkOrderResponse = await axios.post(CPDConfigurations.CPD.workOrderSearch.URL,
        payload,
        {
            headers: { Authorization: `bearer ${corrigoToken.access_token}` }
        })
        .then(res => {
            console.log('response:==')
            return res.data
        })
        .catch(async (error) => {
            console.log("ERROR:==", error)
            await exceptionLogs(integrationObject, error.response.status, error.response.data.Message, error.name, error.config.data, 'cpd-search-workorder', CPDWorkOrderId = "", CPDWorkOrderNumber = "", runnigWorkOrderId = "")
        });
    }
    // console.log('CPDWorkOrderResponse:===',CPDWorkOrderResponse)
    // If you have atlease one work workorder from CPD then process.
    if (CPDWorkOrderResponse !== undefined) {
        if (CPDWorkOrderResponse.WorkOrders.length > 0) {
            getCPDWorkOrderdetails = await validateNewAndUpdatedWO(CPDWorkOrderResponse, cronJobDetails, integrationObject.accountId, integrationObject.integrationsMasterId)
        }
    }


    if (getCPDWorkOrderdetails !== undefined) {
        const cronJob_Details = await integrationsCronJobsModel.findByIdAndUpdate(cronJobDetails._id, {
            pulledCount: getCPDWorkOrderdetails.pullNewWorkOrdersCount || 0,
            pushedCount: getCPDWorkOrderdetails.pushNewWorkordersCount,
            newWOCount: getCPDWorkOrderdetails.CPDNewWorkOrdersPulledCount,
            status: "completed"
        }, { new: true, upsert: true });
    }
    else {
        await integrationsCronJobsModel.findByIdAndUpdate(cronJobDetails._id, {
            status: "completed"
        }, { new: true, upsert: true });
        await integrationsMasterModel.findByIdAndUpdate(integrationObject.integrationsMasterId, { lastPullDate: new Date() }, { new: true });

    }

};

exports.updateCPDWorkOrders = async (integrationObject, typeOfCron, fieldmappingkeys) => {
    const DFWorkorderDetails = await DFWorkOrdersModel.find({ accountId: accountId, integrationsMasterId: integrationObject.integrationsMasterId });
    console.log('DFWorkorderDetails:==', DFWorkorderDetails)
};

