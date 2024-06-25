
const integrationsScheduleCronJobs = require("../controllers/schedulerController");
const integrationsCronJobsModel = require('../models/integrationsMasterModels/integrationsCronsModel')
const axios = require('axios');
const { decryptData } = require("../utils/encryptionAlgorithms");
const CPDWorkordersModel = require("../models/workOrdersModels/CPDWorkordersModel");
const CPDConfigurations = require('../config/integrationsConfiguration')
const asyncWrapper = require("./asyncWrapper");
const integrationsMasterModel = require("../models/integrationsMasterModels/integrationsMasterModel");
const DFWorkOrdersModel = require("../models/workOrdersModels/DFWorkOrdersModel");
const integrationsExceptionsModel = require("../models/integrationsMasterModels/integrationsExceptionsModel");
const integrationsSettingsModel = require("../models/integrationsMasterModels/integrationsSettingsModel");

/**
 * 
 * client_id, client_secret, grant_type, baseUrl required to generate the access token.
 * @returns access token
 */
const CPDAuthentication = async (client_id, client_secret, grant_type, baseUrl,integrationObject) => {
    try {
        const tokenResponse = await axios.post(
            // 'https://oauth-pro-v2.corrigo.com/OAuth/Token',
            `${baseUrl}`,
            `client_id=${client_id}&client_secret=${client_secret}&grant_type=${grant_type}`
        );
        return tokenResponse.data;
    } catch (error) {
        console.log("Error message=", error);
        await integrationsExceptionsModel.create({
            integrationsMasterId: integrationObject.integrationsMasterId,
            accountId: integrationObject.accountId,
            networkCode: error.response.status,
            exceptionMessage: "Authorization has been denied for this request.",
            exceptionTitle: error.name,
            integrationsApiServices : 'auth-failed'
        })
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
    const corrigoToken = await CPDAuthentication(decryptConfigCredentials.client_id, decryptConfigCredentials.client_secret, decryptConfigCredentials.grant_type, decryptConfigCredentials.baseUrl,integrationObject);    
    
    let currentDate = new Date()
    let fromDate, toDate
    const CPDWorkOrdersExist = await CPDWorkordersModel.find({integrationsMasterId: integrationObject.integrationsMasterId, accountId:integrationObject.accountId});
    console.log('IDSSSSS:==',integrationObject.integrationsMasterId, integrationObject.accountId)
    if(CPDWorkOrdersExist.length > 0){
        fromDate = new Date(currentDate.setDate(currentDate.getDate() - 2))
        toDate = new Date()
    }
    else{
        const getFromDateFromIntegrationsSettings = await integrationsSettingsModel.findOne({integrationsMasterId: integrationObject.integrationsMasterId, accountId:integrationObject.accountId});
        if(getFromDateFromIntegrationsSettings){
            fromDate = getFromDateFromIntegrationsSettings.dataDumpFrom
            toDate = new Date()
        }
        else{
            fromDate = new Date(currentDate.setDate(currentDate.getDate() - 28))
            toDate = new Date()
        }
        
    }
    console.log('From:==',fromDate)
    console.log('To:==',toDate)
    // Get work orders from the CPD - API calls.
    const CPDWorkOrderResponse = await axios.post(CPDConfigurations.CPD.workOrderSearch.URL,
        // CPDConfigurations.CPD.workOrderSearch.body,
        {
            "Parameters": {
              //"WorkOrderNumber":"POS4L20001", /*Search by work order number
              /* Search by'Created', 'AcknowledgeBy', 'OnSiteBy', 'DueDate', 'LastUpdate'*/
              "Created": {
                "From": fromDate,
                "To": toDate
                // "To": "2024-02-14T24:00:00.000Z"
              }
              /*Search by work order status -> New,Accepted,Recalled,Rejected,CheckedIn,Paused,CheckedOut,OnHold,Verified,NeedsCompletionDetails*/
              //"Statuses": [ "Accepted","CheckedIn","Rejected","CheckedOut","Verified" ],
              //,"CustomerId" :"90256"
            },
            "MessageId": "f6b492c9-ee7d-4e1b-a9a8-29f50f0b6d3a"
        },
        {
            headers: { Authorization: `bearer ${corrigoToken.access_token}`}
        })
        .then(res=>{console.log('response:==',)
            return res
        })
        .catch(async (error)=>{console.log("ERROR:==",error)
            await integrationsExceptionsModel.create({
                integrationsMasterId: integrationObject.integrationsMasterId,
                accountId: integrationObject.accountId,
                networkCode: error.response.status,
                exceptionMessage: error.response.data.Message,
                exceptionTitle: error.name,
                integrationsApiServices : 'search-workorder'
            })
        });
        // console.log("CPDWorkOrderResponse:==",CPDWorkOrderResponse)

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

