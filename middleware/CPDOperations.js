
const integrationsScheduleCronJobs = require("../controllers/schedulerController");
const integrationsCronJobsModel = require('../models/integrationsMasterModels/integrationsCronsModel')
const axios = require('axios');
const { decryptData } = require("../utils/encryptionAlgorithms");
const CPDWorkordersModel = require("../models/workOrdersModels/CPDWorkordersModel");
const CPDConfigurations = require('../config/integrationsConfiguration')
const asyncWrapper = require("./asyncWrapper");
const integrationsMasterModel = require("../models/integrationsMasterModels/integrationsMasterModel");
const DFWorkOrdersModel = require("../models/workOrdersModels/DFWorkOrdersModel");

/**
 * 
 * client_id, client_secret, grant_type, baseUrl required to generate the access token.
 * @returns access token
 */
const CPDAuthentication = async (client_id, client_secret, grant_type, baseUrl) => {
    try {
        const tokenResponse = await axios.post(
            // 'https://oauth-pro-v2.corrigo.com/OAuth/Token',
            `${baseUrl}`,
            `client_id=${client_id}&client_secret=${client_secret}&grant_type=${grant_type}`
        );
        return tokenResponse.data;
    } catch (error) {
        console.log("CPD Auth Error=", error);
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

                // Update respective CPD #WO to Dataforma with status update and then process. 
                await DFWorkOrdersModel.findOneAndUpdate({"DFWorkOrders.numberAlt":work.WorkOrderNumber, accountId: accountId, integrationsMasterId: integrationsMasterId},{
                    status : "update-request"
                },{new : true})
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
    const corrigoToken = await CPDAuthentication(decryptConfigCredentials.client_id, decryptConfigCredentials.client_secret, decryptConfigCredentials.grant_type, decryptConfigCredentials.baseUrl);    
    
    // Get work orders from the CPD - API calls.
    const CPDWorkOrderResponse = await axios.post(CPDConfigurations.CPD.workOrderSearch.URL,
        CPDConfigurations.CPD.workOrderSearch.body,
        {
            headers: { Authorization: `bearer ${corrigoToken.access_token}`}
        })
        // .then(res=>{console.log('response:==')})
        // .catch(err=>{console.log("ERROR:==",err)});
        console.log("CPDWorkOrderResponse:==",CPDWorkOrderResponse.data)

    // If you have atlease one work workorder from CPD then process. 
    if (CPDWorkOrderResponse.data.WorkOrders.length > 0) {
        getCPDWorkOrderdetails = await validateNewAndUpdatedWO(CPDWorkOrderResponse.data, cronJobDetails, integrationObject.accountId, integrationObject.integrationsMasterId)
    }

    if (getCPDWorkOrderdetails !== undefined) {
        const cronJob_Details = await integrationsCronJobsModel.findByIdAndUpdate(cronJobDetails._id, {
            pulledCount: getCPDWorkOrderdetails.pullNewWorkOrdersCount || 0,
            pushedCount: getCPDWorkOrderdetails.pushNewWorkordersCount,
            newWOCount: getCPDWorkOrderdetails.CPDNewWorkOrdersPulledCount,
            status: "completed"
        }, { new: true, upsert: true });
    }
};

exports.updateCPDWorkOrders = async (integrationObject, typeOfCron, fieldmappingkeys) => {
    const DFWorkorderDetails = await DFWorkOrdersModel.find({ accountId: accountId, integrationsMasterId: integrationObject.integrationsMasterId });
    console.log('DFWorkorderDetails:==', DFWorkorderDetails)
};

