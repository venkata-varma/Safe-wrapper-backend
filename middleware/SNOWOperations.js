
const SNOWConfigurations = require('../config/integrationsConfiguration');
const integrationsExceptionsModel = require('../models/integrationsMasterModels/integrationsExceptionsModel');
const { decryptData } = require('../utils/encryptionAlgorithms');
const querystring = require('querystring')
const axios = require('axios');
const integrationsCronsModel = require('../models/integrationsMasterModels/integrationsCronsModel');
const SNOWWorkOrdersModel = require('../models/workOrdersModels/SNOWWorkOrdersModel');
const integrationsMasterModel = require('../models/integrationsMasterModels/integrationsMasterModel');

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
            }, { ...incidentDetails }, { new: true })
        }
        else {
            await SNOWWorkOrdersModel.create({
                ...incidentDetails
            })
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
    }).catch(async(error) => { 
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