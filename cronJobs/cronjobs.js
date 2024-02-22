const mongooseConnect = require('../config/dbConnection')
const axios = require('axios')
const moment = require('moment')
mongooseConnect.DbConnect()

const workOrderModel = require('../models/workOrderModel');
const cronJobsModel = require('../models/cronJobModel');
const configurationModel = require('../models/configurationModel');
const authentication = require('../utils/authentication');
const serviceChannelWorkOrdersModel = require('../models/serviceChannelWorkOrders');
const customConstants = require('../config/constants.json');
const corrigoProInvoiceModel = require('../models/corrigoProInvoiceModel');
const serviceChannelInvoiceModel = require('../models/serviceChannelInvoiceModel');
const quickBooksInvoiceModel = require('../models/quickBooksInvoiceModel');
const integrationsModel = require('../models/integrationsModel');


async function workOrderAndInvoiceDetailsUpdate() {
    const integrations = await integrationsModel.find({ status: "active" })

    for (const integration of integrations) {
        const configs = await configurationModel.find({ integrationId: integration._id })
        let cronJobsDetails;
        if (configs.length > 0) {
            cronJobsDetails = await cronJobsModel.insertMany({
                status: "initiated",
                cronjobType: "cron-job"
            })

            console.log("cronJobsDetails:====", cronJobsDetails)
            const cronData = {
                date_created: new Date(),
                corrigo_pull_newWorkOrders: [],
                serviceChannel_push_newWorkorders: []
            }
            cronData.registrationId = integration.registrationId
            cronData.integrationId = integration._id
            const promises = configs.map(async configData => {
                const workDetails = {}
                const invoiceDetails = {}
                const cronJobId = cronJobsDetails[0]._id

                if (configData.config_integration_type === "corrigo-pro") {
                    const corrigoToken = await authentication.authentication(configData.credentials.client_id, configData.credentials.client_secret, configData.credentials.grant_type, configData.credentials.baseUrl);

                    if (corrigoToken.access_token) {
                        cronData.status = "inprogress"
                    } else {
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

                    if (workOrderResponse.data.WorkOrders.length > 0) {
                        for (const work of workOrderResponse.data.WorkOrders) {
                            workDetails.workOrders = work;
                            workDetails.MessageId = workOrderResponse.data.MessageId;
                            workDetails.registrationId = configData.registrationId;
                            workDetails.status = "completed"
                            workDetails.cronJobId = cronJobId

                            const work_details = await workOrderModel.findOne({ "workOrders.WorkOrderId": work.WorkOrderId, registrationId:configData.registrationId })
                            if (work_details) {
                                await workOrderModel.findOneAndUpdate({ "workOrders.WorkOrderId": work.WorkOrderId, registrationId:configData.registrationId }, {
                                    workOrders: workDetails.workOrders,
                                    MessageId: workDetails.MessageId,
                                    status: workDetails.status
                                }, { new: true, upsert: true })
                            } else {
                                await workOrderModel.create({
                                    registrationId: workDetails.registrationId,
                                    workOrders: workDetails.workOrders,
                                    MessageId: workDetails.MessageId,
                                    status: workDetails.status,
                                    cronJobId: workDetails.cronJobId
                                })
                                cronData.corrigo_pull_newWorkOrders.push(work)
                            }
                        }
                    }
                } else if (configData.config_integration_type === "service-channel") {
                    const serviceChannelToken = await authentication.serviceChannelAuth(configData.credentials.username, configData.credentials.password, configData.credentials.grant_type, configData.credentials.baseUrl, configData.credentials.Authorization);
                    const workOrder_Details = await workOrderModel.find({ registrationId: configData.registrationId });

                    if (workOrder_Details.length > 0) {
                        for (const workData of workOrder_Details) {
                            if (workData.workOrders) {
                                const serviceChannelWorksOrders = await serviceChannelWorkOrdersModel.findOne({ WorkOrderId: workData.workOrders.WorkOrderId, registrationId:configData.registrationId })
                                let workResponse
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

                                    const configWorkOrder = JSON.parse(workResponse.config.data)
                                    if (serviceChannelWorksOrders) {
                                        await serviceChannelWorkOrdersModel.findOneAndUpdate({ WorkOrderId: workData.workOrders.WorkOrderId, registrationId:configData.registrationId }, {
                                            WorkOrderId: workData.workOrders.WorkOrderId,
                                            workOrders: configWorkOrder,
                                            workOrderStatus: workData.workOrders.Status,
                                            status: "completed"
                                        }, { new: true, upsert: true })
                                    } else {
                                        await serviceChannelWorkOrdersModel.create({
                                            registrationId: configData.registrationId,
                                            WorkOrderId: workData.workOrders.WorkOrderId,
                                            workOrders: configWorkOrder,
                                            workOrderStatus: workData.workOrders.Status,
                                            cronJobId: cronJobId,
                                            status: "completed"
                                        })
                                        cronData.serviceChannel_push_newWorkorders.push(configWorkOrder)
                                    }
                                } catch (err) {
                                    const errorMessage = err.response !== undefined ? err.response.data.ErrorMessage : "Invalid Data"
                                    if (serviceChannelWorksOrders) {
                                        await serviceChannelWorkOrdersModel.findOneAndUpdate({ WorkOrderId: workData.workOrders.WorkOrderId, registrationId:configData.registrationId }, {
                                            WorkOrderId: workData.workOrders.WorkOrderId,
                                            errorMessage: errorMessage,
                                            status: "error"
                                        }, { new: true, upsert: true })
                                    } else {
                                        await serviceChannelWorkOrdersModel.create({
                                            registrationId: configData.registrationId,
                                            WorkOrderId: workData.workOrders.WorkOrderId,
                                            workOrderStatus: workData.workOrders.Status,
                                            cronJobId: cronJobId,
                                            errorMessage: errorMessage,
                                            status: "error"
                                        })
                                    }
                                }
                            }
                        }
                    }
                }
            })

            await Promise.all(promises)

            const cron_Details = await cronJobsModel.findByIdAndUpdate(cronJobsDetails[0]._id, {
                date_created: cronData.date_created,
                registrationId: cronData.registrationId,
                integrationId: cronData.integrationId,
                corrigo_pull_newWorkOrders: cronData.corrigo_pull_newWorkOrders.length,
                serviceChannel_push_newWorkorders: cronData.serviceChannel_push_newWorkorders.length,
                status: "completed"
            }, { new: true, upsert: true })

            console.log("cron_Details:============", cron_Details)
        }
    }
}


async function invoicesUpdate() {
    const integrations = await integrationsModel.find({ status: "active" })
    for (let integration of integrations) {
        const configDetails = await configurationModel.find({ integrationId: integration._id })
        let cronJobsDetails;
        if (configDetails.length > 0) {
            cronJobsDetails = await cronJobsModel.insertMany({
                status: "initiated",
                cronjobType: "cron-job"
            })
            let cronData = {}
            let corrigoPullInvoices = []
            let serviceChannelInvoices = {}
            let serviceChannelInvoicesPush = []
            let quickBooksInvoices = {}
            let quickBooksInvoicesPush = []
            cronData.date_created = new Date()
            cronData.registrationId = integration.registrationId
            cronData.integrationId = integration._id
            for (let config of configDetails) {
                let token
                if (config.config_integration_type === "corrigo-pro") {
                    token = await authentication.authentication(config.credentials.client_id, config.credentials.client_secret, config.credentials.grant_type, config.credentials.baseUrl);
                    const work_details = await workOrderModel.find({})
                    await Promise.all(work_details.map(async (work) => {
                        if (work.workOrders) {
                            let workOrderId = work.workOrders.WorkOrderId;
                            let messageId = work.MessageId;
                            try {
                                const invoiceDetails = await axios.get(`https://am-api.corrigopro.com/Direct/api/invoice?workOrderId=${workOrderId}&messageId=${messageId}`,
                                    {
                                        headers: {
                                            Authorization: `bearer ${token.access_token}`
                                        }
                                    }
                                );
                                let invoice_details = {}
                                invoice_details = invoiceDetails.data.Invoice;
                                invoice_details.registrationId = work.registrationId;
                                invoice_details.MessageId = invoiceDetails.data.MessageId;
                                invoice_details.corrigoProWorkOrderId = workOrderId;
                                invoice_details.cronJobId = cronJobsDetails[0]._id;
                                invoice_details.status = "completed"
                                const invoiceResponse = await corrigoProInvoiceModel.findOne({ corrigoProWorkOrderId: workOrderId, registrationId:work.registrationId });
                                if (invoiceResponse) {
                                    await corrigoProInvoiceModel.findOneAndUpdate({ corrigoProWorkOrderId: workOrderId,registrationId: work.registrationId },
                                        {
                                            invoiceDetails: invoiceDetails.data.Invoice,
                                            MessageId: invoiceDetails.data.MessageId,
                                            status: "completed"
                                        }, { new: true, upsert: true }
                                    );
                                }
                                else {
                                    await corrigoProInvoiceModel.create(invoice_details)
                                    corrigoPullInvoices.push(invoice_details)
                                }
                            }
                            catch (err) {
                                let errorMessage = err.response !== undefined ? err.response.data.Message : "Invalid Data"
                                let invoiceDetails = {}
                                invoiceDetails.registrationId = work.registrationId;
                                invoiceDetails.corrigoProWorkOrderId = workOrderId
                                invoiceDetails.errorMessage = errorMessage
                                invoiceDetails.status = "error",
                                    invoiceDetails.cronJobId = cronJobsDetails[0]._id
                                await corrigoProInvoiceModel.create(invoiceDetails)
                            }
                        }
                    }));
                }
                else if (config.config_integration_type == "service-channel") {
                    let serviceChannelToken = await authentication.serviceChannelAuth(process.env.PROVIDERNAME, process.env.PROVIDERPASSWORD, process.env.GRANT_TYPE, process.env.BASE_URL, process.env.AUTHORIZATION);
                    let invoices = await corrigoProInvoiceModel.find({ registrationId: integration.registrationId });
                    await Promise.all(invoices.map(async (invoice) => {
                        let SC_WorkOrders = await serviceChannelWorkOrdersModel.findOne({ WorkOrderId: invoice.corrigoProWorkOrderId }, { serviceChannelWorkOrderId: 1 })
                        const SC_invoices = await serviceChannelInvoiceModel.findOne({ corrigoProWorkOrderId: invoice.corrigoProWorkOrderId, registrationId:invoice.registrationId });
                        const date = parseInt(moment(new Date()).format('YYYYMMDDss'))
                        let invoiceResponse;
                        let invoiceSC;
                        if (invoice.invoiceDetails) {
                            try {
                                invoiceResponse = await axios.post('https://sb2api.servicechannel.com/v3/invoices',
                                    {
                                        "InvoiceNumber": `${date}`,
                                        "WoIdentifier": `${SC_WorkOrders.serviceChannelWorkOrderId}`,
                                        "InvoiceTax": 0,
                                        "InvoiceTotal": invoice.invoiceDetails.TotalAmount,
                                        "InvoiceText": "HVAC leak",
                                        "InvoiceAmountsDetails": {
                                            "LaborAmount": invoice.invoiceDetails.LineItems[0].Subtotal || 0,
                                            "MaterialAmount": 0,
                                            "TravelAmount": 0,
                                            "FreightAmount": 0,
                                            "OtherAmount": 0,
                                            "OtherDescription": invoice.invoiceDetails.LineItems[0].Description || ""
                                        },
                                        "InvoiceTaxesDetails": {
                                            "LaborTax": 0,
                                            "MaterialTax": 0,
                                            "TravelTax": 0,
                                            "FreightTax": 0,
                                            "OtherTax": 0
                                        }
                                    },
                                    {
                                        headers: {
                                            Authorization: `Bearer ${serviceChannelToken.access_token}`
                                        }
                                    }
                                )
                                invoiceSC = JSON.parse(invoiceResponse.config.data)
                                serviceChannelInvoices.registrationId = invoice.registrationId
                                serviceChannelInvoices.corrigoProWorkOrderId = invoice.corrigoProWorkOrderId
                                serviceChannelInvoices.cronJobId = cronJobsDetails[0]._id
                                serviceChannelInvoices.MessageId = invoice.MessageId
                                serviceChannelInvoices.serviceChannelInvoiceNumber = date
                                serviceChannelInvoices.invoiceDetails = invoiceSC
                                serviceChannelInvoices.errorMessage = null
                                serviceChannelInvoices.status = "completed"
                                if (!SC_invoices) {
                                    await serviceChannelInvoiceModel.create(serviceChannelInvoices)
                                    serviceChannelInvoicesPush.push(invoiceResponse.config.data)
                                }
                                else {
                                    await serviceChannelInvoiceModel.findOneAndUpdate({ corrigoProWorkOrderId: invoice.corrigoProWorkOrderId, registrationId:invoice.registrationId }, {
                                        corrigoProWorkOrderId: invoice.corrigoProWorkOrderId,
                                        MessageId: invoice.MessageId,
                                        serviceChannelInvoiceNumber: invoiceResponse.data.id,
                                        invoiceDetails: invoiceSC,
                                        status: "completed",
                                        errorMessage: null,
                                    }, { new: true, upsert: true })
                                }
                            }
                            catch (err) {
                                serviceChannelInvoices.registrationId = invoice.registrationId
                                serviceChannelInvoices.corrigoProWorkOrderId = invoice.corrigoProWorkOrderId
                                serviceChannelInvoices.status = "error"
                                serviceChannelInvoices.cronJobId = cronJobsDetails[0]._id
                                serviceChannelInvoices.MessageId = invoice.MessageId
                                serviceChannelInvoices.errorMessage = err.response !== undefined ? err.response.data.ErrorMessage : "Invalid Data"
                                if (!SC_invoices) {
                                    await serviceChannelInvoiceModel.create(serviceChannelInvoices)
                                } else {
                                    await serviceChannelInvoiceModel.findOneAndUpdate({ corrigoProWorkOrderId: invoice.corrigoProWorkOrderId, registrationId:invoice.registrationId },
                                        {
                                            corrigoProWorkOrderId: invoice.corrigoProWorkOrderId,
                                            status: "error",
                                            errorMessage: serviceChannelInvoices.errorMessage
                                        }, { new: true, upsert: true })
                                }
                            }
                        }
                    }));
                }
                else if (config.config_integration_type == "quick-books") {
                    console.log("configtype:======", config.config_integration_type)
                    let quickBooksToken = await authentication.quickbooksAuth(config.credentials.baseUrl, refresh_token = process.env.QUICK_BOOKS_REFRSH_TOKEN, config.credentials.grant_type, config.credentials.Authorization);
                    let invoices = await corrigoProInvoiceModel.find({ registrationId: integration.registrationId });
                    await Promise.all(invoices.map(async (invoice) => {
                        const QB_invoices = await quickBooksInvoiceModel.findOne({ corrigoProWorkOrderId: invoice.corrigoProWorkOrderId, registrationId:invoice.registrationId });
                        const date = parseInt(moment(new Date()).format('YYYYMMDDss'))
                        let invoiceResponse;
                        let invoiceSC;
                        if (invoice.invoiceDetails) {
                            try {
                                invoiceResponse = await axios.post(`https://sandbox-quickbooks.api.intuit.com/v3/company/${process.env.QUICK_BOOKS_COMPANYID}/invoice?minorversion=65`,
                                    {
                                        "Line": [
                                            {
                                                "Amount": invoice.invoiceDetails.TotalAmount,
                                                "DetailType": "SalesItemLineDetail",
                                                "SalesItemLineDetail": {
                                                    "ItemRef": {
                                                        "value": "1",
                                                        "name": "Services"
                                                    }
                                                }
                                            }
                                        ],
                                        "CustomerRef": {
                                            "value": "1"
                                        }
                                    },
                                    {
                                        headers: {
                                            Authorization: `Bearer ${quickBooksToken.access_token}`,
                                            "Content-Type": "application/json",
                                            Accept: "application/json"
                                        }
                                    }
                                )
                                quickBooksInvoices.registrationId = invoice.registrationId
                                quickBooksInvoices.corrigoProWorkOrderId = invoice.corrigoProWorkOrderId
                                quickBooksInvoices.cronJobId = cronJobsDetails[0]._id
                                quickBooksInvoices.MessageId = invoice.MessageId
                                quickBooksInvoices.quickBooksInvoiceDetails = invoiceResponse.data.Invoice
                                quickBooksInvoices.errorMessage = null
                                quickBooksInvoices.status = "completed"
                                if (!QB_invoices) {
                                    await quickBooksInvoiceModel.create(quickBooksInvoices)
                                    quickBooksInvoicesPush.push(invoiceResponse.data.Invoice)
                                }
                                else {
                                    await quickBooksInvoiceModel.findOneAndUpdate({ corrigoProWorkOrderId: invoice.corrigoProWorkOrderId, registrationId:invoice.registrationId }, {
                                        corrigoProWorkOrderId: invoice.corrigoProWorkOrderId,
                                        MessageId: invoice.MessageId,
                                        quickBooksInvoiceDetails: invoiceSC,
                                        status: "completed",
                                        errorMessage: null,
                                    }, { new: true, upsert: true })
                                }
                            }
                            catch (err) {
                                quickBooksInvoices.registrationId = invoice.registrationId
                                quickBooksInvoices.corrigoProWorkOrderId = invoice.corrigoProWorkOrderId
                                quickBooksInvoices.status = "error"
                                quickBooksInvoices.cronJobId = cronJobsDetails[0]._id
                                quickBooksInvoices.MessageId = invoice.MessageId
                                quickBooksInvoices.errorMessage = err.response !== undefined ? err.response.data.ErrorMessage : "Invalid Data"
                                if (!QB_invoices) {
                                    await quickBooksInvoiceModel.create(quickBooksInvoices)
                                } else {
                                    await quickBooksInvoiceModel.findOneAndUpdate({ corrigoProWorkOrderId: invoice.corrigoProWorkOrderId, registrationId:invoice.registrationId },
                                        {
                                            corrigoProWorkOrderId: invoice.corrigoProWorkOrderId,
                                            status: "error",
                                            errorMessage: quickBooksInvoices.errorMessage
                                        }, { new: true, upsert: true })
                                }
                            }
                        }
                    }));
                }
            }

            const cronJobs_Details = await cronJobsModel.findByIdAndUpdate(cronJobsDetails[0]._id, {
                date_created: cronData.date_created,
                registrationId: cronData.registrationId,
                integrationId: cronData.integrationId,
                corrigo_pull_newInvoice: corrigoPullInvoices.length,
                serviceChannel_push_newInvoice: serviceChannelInvoicesPush.length,
                quick_books_push_newInvoices: quickBooksInvoicesPush.length,
                status: "completed"
            }, { new: true, upsert: true })
            console.log("cronJobsDetails:=======", cronJobs_Details)
        }
    }
}

module.exports = {
    workOrderAndInvoiceDetailsUpdate,
    invoicesUpdate
}