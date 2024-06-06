
const integrationsScheduleCronJobs = require("../controllers/schedulerController");
const integrationsCronJobsModel = require('../models/integrationsMasterModels/integrationsCronsModel')
const axios = require('axios');
const { decryptData } = require("../utils/encryptionAlgorithms");
const CPDWorkordersModel = require("../models/workOrdersModels/CPDWorkordersModel");
const CPDConfigurations = require('../config/integrationsConfiguration')
const asyncWrapper = require("./asyncWrapper");

/**
 * 
 * client_id, client_secret, grant_type, baseUrl required to generate the access token.
 * @returns access token
 */
const CPDAuthentication = async (client_id, client_secret, grant_type, baseUrl) => {
    try {
        const tokenResponse = await axios.post(
            'https://oauth-pro-v2.corrigo.com/OAuth/Token',
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
const initiateCronJobs = async (cronIntegrationDetails) => {
    const cronDetails = await integrationsCronJobsModel.create(
        {
            cronJobType: "automated",
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
const CPDWorkOrdersDetails = async (CPDWorkOrderResponse, cronJobDetails, accountId, integrationsMasterId) => {
    const workDetails = {}
    const latestWorkOrderCount = {
        pullNewWorkOrdersCount: 0,
        pushNewWorkordersCount: 0
    }
    for (const work of CPDWorkOrderResponse.WorkOrders) {

        workDetails.CPDWorkOrders = work;
        workDetails.MessageId = CPDWorkOrderResponse.MessageId;
        workDetails.accountId = accountId;
        workDetails.integrationsCronJobId = cronJobDetails._id
        // const CPD_work_details = await CPDWorkordersModel.findOne({ $and :[{CPDWorkOrderId: work.WorkOrderId}, {accountId: accountId}, {integrationsMasterId : integrationsMasterId},{CPDWorkOrderStatus : {$ne : work.Status}}] })
        const CPD_work_details = await CPDWorkordersModel.findOne({
            $and: [
              { CPDWorkOrderId: work.WorkOrderId },
              { accountId: accountId },
              { integrationsMasterId: integrationsMasterId },
            ]
          });
        // console.log('step 4:===')
        if (CPD_work_details) {
            if(CPD_work_details.CPDWorkOrderStatus !== work.Status){
            // console.log('step 5')
            await CPDWorkordersModel.findOneAndUpdate({ CPDWorkOrderId: work.WorkOrderId, accountId: accountId, integrationsMasterId : integrationsMasterId }, {
                CPDWorkOrders: workDetails.CPDWorkOrders,
                MessageId: workDetails.MessageId,
                CPDWorkOrderStatus :work.Status,
                status:'initiated',
            }, { new: true, upsert: true });
        }
        else{
            //nothing
        }
        } else {
            // console.log('step 6')

            await CPDWorkordersModel.create({
                CPDWorkOrderId: work.WorkOrderId,
                accountId: workDetails.accountId,
                CPDBranchId : work.BranchId,
                CPDWorkOrders: workDetails.CPDWorkOrders,
                CPDWorkOrderStatus :work.Status,
                MessageId: workDetails.MessageId,
                integrationsCronId: workDetails.integrationsCronJobId,
                integrationsMasterId : integrationsMasterId
            })
            latestWorkOrderCount.pullNewWorkOrdersCount++
        }
    }
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

exports.getCPDWorkOrders = asyncWrapper(async (integrationObject) => {
    // console.log('integrationObject:==',integrationObject)

    let encrypted = {};
    let getCPDWorkOrderDetials;
    const cronJobDetails = await initiateCronJobs({
        accountId: integrationObject.accountId,
        serviceProvider: integrationObject.serviceProvider,
        integrationsMasterId: integrationObject.integrationsMasterId
    });

    encrypted = { iv: process.env.CRYPTO_IV, encryptedData: integrationObject.credentials};
    // console.log("Step-1 called");

    decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY))
    // console.log("Step-2 called");

    const corrigoToken = await CPDAuthentication(decryptConfigCredentials.client_id, decryptConfigCredentials.client_secret, decryptConfigCredentials.grant_type, decryptConfigCredentials.baseUrl);
    // console.log("Step-3 called");

    const CPDWorkOrderResponse = await axios.post(CPDConfigurations.CPD.workOrderSearch.URL,
        CPDConfigurations.CPD.workOrderSearch.body,
        {
            headers: {
                Authorization: `bearer ${corrigoToken.access_token}`
            }
        });
        
    // console.log('CPDWorkOrderResponse:===',CPDWorkOrderResponse)
    
    if (CPDWorkOrderResponse.data.WorkOrders.length > 0) {
        getCPDWorkOrderDetials = await CPDWorkOrdersDetails(CPDWorkOrderResponse.data, cronJobDetails, integrationObject.accountId, integrationObject.integrationsMasterId)
    }  
    const cronJob_Details = await integrationsCronJobsModel.findByIdAndUpdate(cronJobDetails._id, {
        pulledCount: getCPDWorkOrderDetials.pullNewWorkOrdersCount,
        pushedCount: getCPDWorkOrderDetials.pushNewWorkordersCount,
        status: "completed"
    }, { new: true, upsert: true });
});


// module.exports = getCPDWorkOrders

