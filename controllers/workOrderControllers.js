const workOrderModel = require('../models/workOrderModel');
const axios = require('axios');
const authentication = require('../utils/authentication');
const registrtionModel = require('../models/registrtionModel');
const usersModel = require('../models/usersModel');
const sessionModel = require('../models/sessionModel');
const settingsModel = require('../models/settingsModel');
const configurationModel = require('../models/configurationModel');
const cronJobsModel = require('../models/cronJobModel');
const serviceChannelWorkOrdersModel = require('../models/serviceChannelWorkOrders')
const customConstants = require('../config/constants.json');
const { ObjectId } = require('mongodb')

const { workOrderAndInvoiceDetailsUpdate } = require('../cronJobs/cronjobs');
const { default: mongoose, Schema, Mongoose } = require('mongoose');
const integrationsModel = require('../models/integrationsModel');
const asyncWrapper = require('../middleware/asyncWrapper');
const corrigoProInvoiceModel = require('../models/corrigoProInvoiceModel');
const serviceChannelInvoiceModel = require('../models/serviceChannelInvoiceModel');
const quickBooksInvoiceModel = require('../models/quickBooksInvoiceModel');



exports.workOrderDetails = asyncWrapper(async (req, res) => {
    try {
        // console.log("accessToken:==========",req)

        const { ids, messageId } = req.params;
        const { client_id, client_secret, grant_type } = req.body;
        let accessToken = await authentication.authentication(client_id, client_secret, grant_type);
        let response = {}
        console.log('process.env.WORKORDER_URL:=======', accessToken)

        const result = await axios.get(
            `${process.env.WORKORDER_URL}?ids=${ids}&messageId=${messageId}`,
            {
                headers: {
                    Authorization: `bearer ${accessToken.access_token}`
                }
            }
        )


        response = result.data.WorkOrders;
        response[0].MessageId = messageId;
        response[0].registrationId = '65c390f8172c5ea988991d04'
        await workOrderModel.create(response[0])
        res.status(200).json({ success: true, data: response });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

exports.invoiceDetails = asyncWrapper(async (req, res) => {
    try {
        const { workOrderId, messageId, clientId } = req.body;
        let response = {};
        // let tokenDetails = await accessTokenModel.findOne({clientId:clientId})
        const invoiceResponse = await axios.get(
            `${process.env.INVOICE_URL}?workOrderId=${workOrderId}&messageId=${messageId}`,
            {
                headers: {
                    Authorization: `bearer eyJBdXRoZW50aWNhdGlvblR5cGUiOiJCZWFyZXIiLCJOYW1lQ2xhaW1UeXBlIjoiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSIsIlJvbGVDbGFpbVR5cGUiOiJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1lIiwiQ2xhaW1zIjpbeyJUeXBlIjoiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSIsIlZhbHVlIjoiMzBDMTk1N0Y2N0NBMTkxRkJCQjRCNDc2QjY5MDdBMkMiLCJWYWx1ZVR5cGUiOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSNzdHJpbmciLCJJc3N1ZXIiOiJMT0NBTCBBVVRIT1JJVFkiLCJPcmlnaW5hbElzc3VlciI6IkxPQ0FMIEFVVEhPUklUWSJ9LHsiVHlwZSI6InVybjpvYXV0aDpzY29wZSIsIlZhbHVlIjoiIiwiVmFsdWVUeXBlIjoiaHR0cDovL3d3dy53My5vcmcvMjAwMS9YTUxTY2hlbWEjc3RyaW5nIiwiSXNzdWVyIjoiTE9DQUwgQVVUSE9SSVRZIiwiT3JpZ2luYWxJc3N1ZXIiOiJMT0NBTCBBVVRIT1JJVFkifSx7IlR5cGUiOiJBdWQiLCJWYWx1ZSI6IkNvcnJpZ29Qcm9EaXJlY3QiLCJWYWx1ZVR5cGUiOiJodHRwOi8vd3d3LnczLm9yZy8yMDAxL1hNTFNjaGVtYSNzdHJpbmciLCJJc3N1ZXIiOiJMT0NBTCBBVVRIT1JJVFkiLCJPcmlnaW5hbElzc3VlciI6IkxPQ0FMIEFVVEhPUklUWSJ9XSwiUHJvcGVydGllcyI6eyJEaWN0aW9uYXJ5Ijp7Ii5pc3N1ZWQiOiJXZWQsIDA3IEZlYiAyMDI0IDE0OjQ4OjA5IEdNVCIsIi5leHBpcmVzIjoiV2VkLCAwNyBGZWIgMjAyNCAxNTowODowOSBHTVQifX19<---->BRc4Slcf4EMQNiegj1X76CHI-jq7hP7XPF_CAdCFo1I3AeF6rbfaduGf4KnP2w3_6CW2vGC5EyolnSa0756GSEli0KKottg1bfGnSNYxiiPcREJJi-cH1AKZMpWDsiostAuFGZcqlnSwLi5YgIdCCTbymIlhMHvc_HVczHxOJF4cFdLilJ9wu_BtbSviLJ3oP7FT3OKgFimLgp_WcSMLeS4jsMONWnbj3Apa80IK8xJdnmdJKYXIFYKXUlBhOzrhv6jd9_aWuen9fd0KEP1jkl7DybdCBxdr_PSdXdf7MdnKopXqx-LN8nDBY3gdo1mN2Sf9SOf1bacbj8Fs40VsYA`,
                    'Content-Type': 'application/json'
                }
            }
        );
        // console.log(invoiceResponse.data);

        response = invoiceResponse.data;
        response.Invoice.MessageId = messageId
        response.Invoice.registrationId = '65c390f8172c5ea988991d04'
        await invoiceModel.create(response.Invoice)
        res.status(200).json({ success: true, data: response.Invoice });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});


exports.validateuserRegistration = asyncWrapper(async (req, res, next) => {
    const { fullName, companyName, email, mobileNumber, password, status } = req.body
    if (fullName === "" || companyName === "" || email === "" || mobileNumber === "" || password === "") {
        return res.status(customConstants.statusCodes.UNPROCESSABLE_STATUS_CODE_FAIL).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_MANDATORY_FIELDS
        });
    }
    else {
        next()
    }
})


exports.createUser = asyncWrapper(async (req, res) => {
    const { fullName, companyName, email, mobileNumber, password, status } = req.body
    const userDetails = await registrtionModel.findOne({ $or: [{ email }, { mobileNumber }] })
    console.log(req.body)
    if (userDetails) {
        return res.status(409).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_USER_EXIST
        })
    }
    else {
        const userData = await registrtionModel.create(req.body)
        req.body.registrationId = userData._id
        const user_details = await usersModel.create(req.body)
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_CREATED).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_USER_CREATED,
            data: userData
        })
    }
});

exports.validateuser = asyncWrapper(async (req, res) => {
    const { mobileEmail, password } = req.body
    let userDetails = {}

    const user = await usersModel.findOne({ $or: [{ email: mobileEmail }, { mobileNumber: mobileEmail }] });
    const user_details = await registrtionModel.findById(user.registrationId, { password: 0, _id: 0 });
    userDetails.user = user_details
    if (!user || user.password !== password) {
        return res.status(401).json({ status: customConstants.messages.MESSAGE_FAIL, message: customConstants.messages.MESSAGE_INVALID });
    }
    //insert data into sessions
    const jwtToken = await user.getJWTToken();
    const jwtTokenExpires = await user.getJWTTokenExpireDate(jwtToken);
    req.body.accessToken = jwtToken;
    req.body.expirationTime = jwtTokenExpires.exp;
    req.body.userId = user._id


    let sesssionDetails = await sessionModel.create(req.body)
    userDetails.sesssionDetails = sesssionDetails

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_USER_LOGIN,
        data: userDetails
    });
});

exports.globalConstants = asyncWrapper(async (req, res) => {

    const corrigoCMMS = [
        {
            "companyName": "Corrigo Pro",
            "companyLogo": "https://corrigopro.com/wp-content/uploads/2017/08/cplogo.png"
        },
    ]

    const thirdPartyServiceProviders = [
        {
            "companyName": "Quick Books",
            "companyLogo": "https://plugin.intuitcdn.net/identity-authn-core-ui/8a55fd2040ecaf181e6c.svg"
        },

        {
            "companyName": "Microsoft Dynamics GP",
            "companyLogo": "https://tipalti.com/wp-content/themes/Tipalti-GoTeam/assets/customer-logos/logo-microsoft-MC-D.webp"
        },

        {
            "companyName": "Turbo Tax",
            "companyLogo": "https://plugin.intuitcdn.net/identity-authn-core-ui/4901eab9003922483088.svg"
        },

        {
            "companyName": "Acumatica",
            "companyLogo": "https://cdn.acumatica.com/content/themes/acumatica/assets/img/svg/logo-dark.svg"
        },
        {
            "companyName": "Sage Intacct",
            "companyLogo": "https://www.sage.com/en-us/-/media/images/sagedotcom/master/icons/product%20icons%20over%20dark/sage-intacct-48x48-icon.svg?iar=0&extension=webp&hash=3C76D971F0BDB5484BA11755E469A242"
        },
        {
            "companyName": "Oracle",
            "companyLogo": "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Oracle_Corporation_logo.svg/2560px-Oracle_Corporation_logo.svg.png"
        }
    ]

    const credentials = [{
        corrigo_pro_crdentials:{
            "client_id": "F68C77D715A71E558E1D7292FD25E682",
            "client_secret": "84CF7EAF69A0189AA65A812B6DE0EF32849E7C5DF1C50164CFD49069F7C4A281D396307F47580E5573DD30BA25F3E7AE2E400D5FA88890BFCE1ADF9510AFA3E2",
            "grant_type": "client_credentials",
            "baseUrl": "http://oauth-pro-v2.corrigo.com/OAuth/Token",
            "MessageId": "f6b492c9-ee7d-4e1b-a9a8-29f50f0b6d3a"
        },
        service_channel_credentials:{
            "baseUrl": "https://sb2login.servicechannel.com/oauth/token",
            "username": "SC-Dev1",
            "password": "servicechannel1",
            "grant_type": "password",
            "Authorization": "Basic U0IuMjAxNDkxNzI0My5ENEQyODUzMC1FRjE0LTQ5NjctOTkxOC1GMTNGN0U5MDc2REY6N0Y3MDJFRDEtQUYwRi00ODRBLTkwM0EtRThFRTMwNTUxODUw"
        },
        quick_books_credentials:{
            "baseUrl": "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
            "client_id": "ABZk1zO4yKkebi0zbDqu4F2iRf6CQNkrsn0gODR2Lapa24sFZ7",
            "client_secret": "2RCek8ohiB3hI1Fb2Io7B76ku6oA9egDS0aGdZ9O",
            "grant_type": "refresh_token",
            "Authorization": "Basic QUJaazF6TzR5S2tlYmkwemJEcXU0RjJpUmY2Q1FOa3JzbjBnT0RSMkxhcGEyNHNGWjc6MlJDZWs4b2hpQjNoSTFGYjJJbzdCNzZrdTZvQTllZ0RTMGFHZFo5Tw=="
        }
    }]

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_GLOBAL_CONSTANTS,
        data: { corrigoCMMS, thirdPartyServiceProviders, credentials }
    })
});

exports.configSettings = asyncWrapper(async (req, res) => {
    const { periodType, periodSettings, integrationId } = req.body
    const settingsDetails = await settingsModel.create(req.body)
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_SETTINGS_DETAILS,
        data: settingsDetails
    })
})

exports.configIntegration = asyncWrapper(async (req, res) => {
    const { credentials, config_integration_type, status, registrationId, integrationId } = req.body;
    req.body.status = 'verified';

    if (config_integration_type == 'corrigo-pro') {
        const token = await authentication.authentication(credentials.client_id, credentials.client_secret, credentials.grant_type, credentials.baseUrl);
        if (token === 'error')
            req.body.status = "rejected";
    }
    else if (config_integration_type == 'service-channel') {
        const token = await authentication.serviceChannelAuth(credentials.username, credentials.password, credentials.grant_type, credentials.baseUrl, credentials.Authorization);
        console.log('token:=======', token)
        if (token === 'error')
            req.body.status = "rejected";
    }
    else if (config_integration_type == 'quick-books') {
        const token = await authentication.quickbooksAuth(credentials.baseUrl, refresh_token=process.env.QUICK_BOOKS_REFRSH_TOKEN, credentials.grant_type, credentials.Authorization);
        console.log('token:=======', token)
        if (token === 'error')
            req.body.status = "rejected";
    }
    if (req.body.status === "rejected") {
        return res.status(customConstants.statusCodes.FORBIDDEN).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_AUTH_UN_VERIFIED,
            // data: clientDetails
        });
    }
    else
        req.body.status = "verified"
    let clientDetails = await configurationModel.find({ $and: [{ registrationId: registrationId }, { integrationId: integrationId }, { config_integration_type: config_integration_type }] });
    console.log("clientDetails=", clientDetails.length);

    if (clientDetails.length === 0) {
        clientDetails = await configurationModel.create(req.body)
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_AUTH_VERIFIED,
            data: clientDetails
        });
    }
    else {
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_AUTH_VERIFIED,
            data: clientDetails
        });
    }
});

exports.pullLatestWorkOrders = asyncWrapper(async (req, res) => {
    const { registrationId } = req.params
    const configs = await configurationModel.find({ registrationId })
    const cronJobsDetails = await cronJobsModel.insertMany({
        status: "initiated"
    })
    let cronData = {}
    let cron_Details
    cronData.date_created = new Date()
    cronData.cronjobType = "manual"
    let corrigo_pull_newWorkOrders = [], serviceChannel_push_newWorkorders = []
    for (let configData of configs) {
        let workDetails = {}
        let invoiceDetails = {}
        let config_integration_type = configData.config_integration_type;
        cronData.registrationId = configData.registrationId
        cronData.integrationId = configData.integrationId
        if (config_integration_type == "corrigo-pro") {
            let corrigoToken = await authentication.authentication(configData.credentials.client_id, configData.credentials.client_secret, configData.credentials.grant_type, configData.credentials.baseUrl);
            if (corrigoToken.access_token) {
                cronData.status = "inprogress"
            }
            else {
                cronData.status = "declined"
            }
            const workOrderResponse = await axios.post(
                'https://am-api.corrigopro.com/Direct/api/workOrder/search',
                {
                    "Parameters": {
                        //"WorkOrderNumber":"POS4L20001", /*Search by work order number
                        /* Search by'Created', 'AcknowledgeBy', 'OnSiteBy', 'DueDate', 'LastUpdate'*/
                        "Created": {
                            "From": "2024-02-06T00:00:00Z",
                            "To": new Date()
                            // "To": "2024-02-07T24:00:00.000Z"
                        }
                        /*Search by work order status -> New,Accepted,Recalled,Rejected,CheckedIn,Paused,CheckedOut,OnHold,Verified,NeedsCompletionDetails*/
                        // ,"Statuses": [ "Accepted","CheckedIn" ]
                        //,"CustomerId" :"90256"
                    },
                    "MessageId": "f6b492c9-ee7d-4e1b-a9a8-29f50f0b6d3a"
                },
                {
                    headers: {
                        Authorization: `bearer ${corrigoToken.access_token}`
                    }
                }
            );
            for (let work of workOrderResponse.data.WorkOrders) {
                workDetails.workOrders = work;
                workDetails.MessageId = workOrderResponse.data.MessageId;
                workDetails.registrationId = configData.registrationId;
                workDetails.status = "completed",
                    workDetails.cronJobId = cronJobsDetails[0]._id

                const work_details = await workOrderModel.findOne({ "workOrders.WorkOrderId": work.WorkOrderId })
                if (work_details) {
                    await workOrderModel.findOneAndUpdate({ WorkOrderId: work.WorkOrderId }, {
                        registrationId: workDetails.registrationId,
                        workOrders: workDetails.workOrders,
                        MessageId: workDetails.MessageId,
                        status: workDetails.status
                    })
                }
                else {
                    await workOrderModel.create({
                        registrationId: workDetails.registrationId,
                        workOrders: workDetails.workOrders,
                        MessageId: workDetails.MessageId,
                        status: workDetails.status,
                        cronJobId: workDetails.cronJobId
                    })
                    corrigo_pull_newWorkOrders.push(work)
                    cronData.registrationId = configData.registrationId
                }
            }
        }
        else if (config_integration_type == "service-channel") {
            let serviceChannelToken = await authentication.serviceChannelAuth(configData.credentials.username, configData.credentials.password, configData.credentials.grant_type, configData.credentials.baseUrl, configData.credentials.Authorization);
            if (serviceChannelToken.access_token) {
                cronData.status = "inprogress"
            }
            else {
                cronData.status = "declined"
            }
            let workOrder_Details = await workOrderModel.find({ registrationId: configData.registrationId }).lean();
            for (workData of workOrder_Details) {
                if (workData.workOrders) {
                    let workResponse
                        const serviceChannelWorksOrders = await serviceChannelWorkOrdersModel.findOne({ WorkOrderId: workData.workOrders.WorkOrderId })
                        try {
                        workResponse = await axios.post(
                            'https://sb2api.servicechannel.com/v3/workorders',
                            {
                                "ContractInfo": {
                                    "StoreId": "102",
                                    "TradeName": "HVAC",
                                    "ProviderId": 2000090505
                                },
                                "Category": 'MAINTENANCE',
                                "Priority": "P2 - 8 Hours",
                                "Nte": 0,
                                "CallDate": workData.workOrders.Created,
                                "ScheduledDate": workData.workOrders.Sla.OnSiteBy,
                                "Description": `${workData.workOrders.WorkOrderNumber}-${workData.workOrders.WorkType.Name}`,
                                "Status": {
                                    "Primary": "Open",
                                    "Extended": ""
                                }
                            },
                            {
                                headers: {
                                    Authorization: `Bearer ${serviceChannelToken.access_token}`
                                }
                            }
                        )
                        // console.log('workResponse:======',workResponse.data)
                        let configWorkOrder = JSON.parse(workResponse.config.data)
                        if (serviceChannelWorksOrders) {
                            await serviceChannelWorkOrdersModel.findOneAndUpdate({ WorkOrderId: workData.workOrders.WorkOrderId }, {
                                registrationId: configData.registrationId,
                                WorkOrderId: workData.workOrders.WorkOrderId,
                                workOrders: configWorkOrder,
                                errorMessage:null,
                                corrigoProworkOrderStatus: workData.workOrders.Status,
                                status: "completed"

                            }, { new: true,upsert:true })
                        }
                        else {
                            await serviceChannelWorkOrdersModel.create({
                                registrationId: configData.registrationId,
                                WorkOrderId: workData.workOrders.WorkOrderId,
                                workOrders: configWorkOrder,
                                corrigoProworkOrderStatus: workData.workOrders.Status,
                                serviceChannelWorkOrderId: workResponse.data.id,
                                errorMessage:null,
                                cronJobId: cronJobsDetails[0]._id,
                                status: "completed"
                            });
                            serviceChannel_push_newWorkorders.push(configWorkOrder)
                        }
                    }
                    catch (err) {
                        let errorMessage = err.response !== undefined ? err.response.data.ErrorMessage : "Invalid Data"
                        if (serviceChannelWorksOrders) {
                            console.log('IfErrorr:============')
                            await serviceChannelWorkOrdersModel.findOneAndUpdate({ WorkOrderId: workData.workOrders.WorkOrderId }, {
                                registrationId: configData.registrationId,
                                WorkOrderId: workData.workOrders.WorkOrderId,
                                // serviceChannelWorkOrderId: workResponse.data.id,
                                errorMessage: errorMessage,
                                status: "error"
                            }, { new: true, upsert: true })
                        }
                        else {
                            console.log('ElseErrorr:============')
                            await serviceChannelWorkOrdersModel.create({
                                registrationId: configData.registrationId,
                                WorkOrderId: workData.workOrders.WorkOrderId,
                                cronJobId: cronJobsDetails[0]._id,
                                errorMessage: errorMessage,
                                status: "error"
                            })
                        }
                    }
                }
            }
        }
    }
    cronData.corrigo_pull_newWorkOrders = corrigo_pull_newWorkOrders.length
    cronData.serviceChannel_push_newWorkorders = serviceChannel_push_newWorkorders.length
    cronData.status = "completed"
    cron_Details = await cronJobsModel.findByIdAndUpdate(cronJobsDetails[0]._id, cronData, { new: true,upsert:true })
    console.log("cron_Details:=========",cron_Details)
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_CRON_MANUAL
    });
});

exports.getAWorkOrdersByRegistrationId = asyncWrapper(async (req, res) => {
    const { registrationId } = req.params
    const corrigo_pro_workOrders = await workOrderModel.find({ registrationId }).lean();
    const service_channel_workOrders = await serviceChannelWorkOrdersModel.find({ registrationId }).lean();
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_WORKORDERS,
        data: { corrigo_pro_workOrders, service_channel_workOrders }
    })
});

exports.getInvoicesByRegistraionId = asyncWrapper(async (req, res) => {
    const { registrationId } = req.params
    const corrigo_pro_invoices = await corrigoProInvoiceModel.find({ registrationId }).lean();
    const service_channel_invoices = await serviceChannelInvoiceModel.find({ registrationId }).lean();
    const quick_books_invoices = await quickBooksInvoiceModel.find({registrationId}).lean();

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_INVOICES,
        data: { corrigo_pro_invoices, service_channel_invoices, quick_books_invoices }
    })
})

exports.getLatestCronJobs = asyncWrapper(async (req, res) => {
    const { registrationId } = req.params

    const latestCronJobs = await cronJobsModel.find({ registrationId }).sort({ _id: -1 }).limit(20);
    // const totalCronJobsCount = totalCronJobs.length;

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_CRON_MANUAL,
        data: { latestCronJobs }
    })

});

exports.getStatastics = asyncWrapper(async (req, res) => {
    const { registrationId } = req.params
    const cronjobDetails = await cronJobsModel.find({ registrationId });
    const cronJobIds = cronjobDetails.map(({ _id }) => _id);
    const totalCorrigoProWorkOrders = await workOrderModel.find({ $and: [{ registrationId }, { "cronJobId": { $in: cronJobIds } }] });
    // console.log('totalCorrigoProWorkOrders:==',totalCorrigoProWorkOrders)
    const totalServiceChannelWorkOrders = await serviceChannelWorkOrdersModel.find({ $and: [{ registrationId }, { "cronJobId": { $in: cronJobIds } }] });
    const usersCount = await usersModel.find({ registrationId });
    const cronjobsCount = await cronJobsModel.find({ registrationId });
    const totalIntegrations = await integrationsModel.find({registrationId}).lean();
    const totalInvoices = await corrigoProInvoiceModel.find({ $and: [{ registrationId }, { "cronJobId": { $in: cronJobIds } }] }).lean();
    const service_channel_invoices = await serviceChannelInvoiceModel.find({ $and: [{ registrationId }, { "cronJobId": { $in: cronJobIds } }] }).lean();
    const quick_books_invoices = await quickBooksInvoiceModel.find({ $and: [{ registrationId }, { "cronJobId": { $in: cronJobIds } }] }).lean();
    let configCount = []
    let integrations = []

    for (const integration of totalIntegrations) {
        const configDetails = await configurationModel.find({ registrationId,integrationId: integration._id }, { config_integration_type: 1, registrationId: 1, status: 1 }).populate('registrationId');
        integration.configDetails = configDetails
        integrations.push(integration);
        configCount.push(...configDetails)
    }
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_CRON_MANUAL,
        data: {
            getStatastics: {
                totalCorrigoProWorkOrders: totalCorrigoProWorkOrders.length,
                totalServiceChannelWorkOrders: totalServiceChannelWorkOrders.length,
                corrigoProInvoicesCount: totalInvoices.length,
                serviceChannelInvoicesCount: service_channel_invoices.length,
                quickBooksInvoicesCount: quick_books_invoices.length,
                usersCount: usersCount.length,
                cronjobsCount: cronjobsCount.length,
                totalIntegrationscount: totalIntegrations.length,
                configurationsCount: configCount.length,
                integrations

            }
        }
    })


});



exports.getCronJobsWorkOrders = asyncWrapper(async (req, res) => {
    const { registrationId, cronJobId } = req.params;

    const corrigoWorkOrders = await workOrderModel.find({ $and: [{ registrationId: registrationId }, { cronJobId: cronJobId }] });
    const ServiceChannelWorkOrders = await serviceChannelWorkOrdersModel.find({ $and: [{ registrationId: registrationId }, { cronJobId: cronJobId }] });

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_CRON_WORKORDERS,
        data: {
            corrigoWorkOrders, ServiceChannelWorkOrders
        }
    })
})

exports.integrations = asyncWrapper(async (req, res) => {
    const { name, description, userId, registrationId } = req.body;
    const integrationsDetails = await integrationsModel.create(req.body);

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_INTEGRATIONS,
        data: { integrationsDetails }
    });
});


exports.getsingleInegration = asyncWrapper(async (req, res) => {
    const { integrationId } = req.params;
    const integrationDetails = await integrationsModel.findById(integrationId);
    const configDetails = await configurationModel.find({ integrationId })
    const cronjobDetails = await cronJobsModel.find({ integrationId });

    const cronJobIds = cronjobDetails.map(({ _id }) => _id);
    const CPDWorkOrders = await workOrderModel.find({ "cronJobId": { $in: cronJobIds } });
    const SCWorkOrders = await serviceChannelWorkOrdersModel.find({ "cronJobId": { $in: cronJobIds } });
    const CPDInvoices = await corrigoProInvoiceModel.find({ "cronJobId": { $in: cronJobIds } });
    const SCInvoices = await serviceChannelInvoiceModel.find({ "cronJobId": { $in: cronJobIds } });
    const QBInvoices = await quickBooksInvoiceModel.find({ "cronJobId": { $in: cronJobIds } })
    const settingsDetails = await settingsModel.find({ integrationId })

    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_GET_INTEGRATIONS,
        data: {
            totalCorrigoProWorkOrders: CPDWorkOrders.length, totalServiceChannelWorkOrders: SCWorkOrders.length,
            totalCorrigoProInvoices: CPDInvoices.length, totalServiceChannelInvoices: SCInvoices.length,
            totalQuickBooksInvoices:QBInvoices.length,
            cronjobsCount: cronjobDetails.length, integrationDetails,
            configDetails, cronjobDetails,
            settingsDetails: settingsDetails,
            corrigoWorkOrders: CPDWorkOrders, ServiceChannelWorkOrders: SCWorkOrders,
            corrigoProInvoices: CPDInvoices,
            serviceChannelInvoices: SCInvoices,
            quickBoksInvoices:QBInvoices
        }
    });
});

exports.latestWorkOrders = asyncWrapper(async (req, res) => {
    const { integrationId, registrationId } = req.params;
    const integrationDetails = await integrationsModel.findById(integrationId)
    const cronJobDetails = await cronJobsModel.find({ integrationId })

    let corrigo_pro_workOrders = [];
    let service_channel_workOrders = [];
    for (let cronDetails of cronJobDetails) {
        const corrigoProWorkOrders = await workOrderModel.find({ cronJobId: cronDetails._id, registrationId: registrationId })
        const serviceChannelWorkOrders = await serviceChannelWorkOrdersModel.find({ cronJobId: cronDetails._id, registrationId: registrationId })

        corrigo_pro_workOrders.push(corrigoProWorkOrders)
        service_channel_workOrders.push(serviceChannelWorkOrders)
    };
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_LATEST_WORKORDERS,
        data: {
            corrigo_pro_workOrders: corrigo_pro_workOrders[0],
            service_channel_workOrders: service_channel_workOrders[0],
            integrationDetails, cronJobDetails

        }
    });
});

exports.deleteIntegration = asyncWrapper(async (req, res) => {
    const { integrationId } = req.params
    const integrationDetails = await integrationsModel.findByIdAndUpdate(integrationId, { status: "deleted" }, { new: true });
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_DELETE_INTEGRATION,
        data: { integrationDetails }
    });
});


exports.editIntegration = asyncWrapper(async (req, res) => {
    const { integrationId } = req.params;
    const { name, description } = req.body;
    const integrationDetails = await integrationsModel.findByIdAndUpdate(integrationId, {
        name: name, description: description
    }, { new: true });
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_UPDATE_INTEGRATION,
        data: { integrationDetails }
    });
})

exports.editConfigurationByIntegrationId = asyncWrapper(async (req, res) => {
    const { integrationId, configurationId } = req.params;

    const { credentials, config_integration_type, status, registrationId } = req.body;
    req.body.integrationId = integrationId;
    req.body.configurationId = configurationId;
    req.body.status = 'verified';

    if (config_integration_type == 'corrigo-pro') {
        const token = await authentication.authentication(credentials.client_id, credentials.client_secret, credentials.grant_type, credentials.baseUrl);
        if (token === 'error')
            req.body.status = "rejected";
    }
    else if (config_integration_type == 'service-channel') {
        const token = await authentication.serviceChannelAuth(credentials.username, credentials.password, credentials.grant_type, credentials.baseUrl, credentials.Authorization);
        console.log('token:=======', token)
        if (token === 'error')
            req.body.status = "rejected";
    }
    else if (config_integration_type == 'quick-books') {
        const token = await authentication.quickbooksAuth(credentials.baseUrl, refresh_token=process.env.QUICK_BOOKS_REFRSH_TOKEN, credentials.grant_type, credentials.Authorization);
        console.log('token:=======', token)
        if (token === 'error')
            req.body.status = "rejected";
    }
    if (req.body.status === "rejected") {
        return res.status(customConstants.statusCodes.FORBIDDEN).json({
            status: customConstants.messages.MESSAGE_FAIL,
            message: customConstants.messages.MESSAGE_AUTH_UN_VERIFIED,
            // data: clientDetails
        });
    }
    else {
        req.body.status = "verified"
        let clientDetails = await configurationModel.findOneAndUpdate({$and:[{_id:configurationId},{integrationId:integrationId}]},req.body,{new:true,upsert:true})
        return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
            status: customConstants.messages.MESSAGE_SUCCESS,
            message: customConstants.messages.MESSAGE_CONFIGURATION_UPDATE,
            data: clientDetails
        });
    }
});

exports.editSettingsByIntegrationId = asyncWrapper(async (req, res) => {
    const { integrationId } = req.params;
    const { periodType, periodSettings } = req.body
    req.body.integrationId = integrationId
    await settingsModel.findOneAndDelete({ integrationId })
    const settingsDetails = await settingsModel.create(req.body)
    return res.status(customConstants.statusCodes.SUCCESS_STATUS_CODE_SUCCESS).json({
        status: customConstants.messages.MESSAGE_SUCCESS,
        message: customConstants.messages.MESSAGE_SETTINGS_DETAILS_UPDATE,
        data: settingsDetails
    })

});