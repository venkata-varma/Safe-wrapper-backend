const moment = require('moment')
const integrationsFieldMappingModel = require("../models/integrationsFieldMappingModel");
const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");
const CPDOperations = require('./CPDOperations');
const DFOperations = require('./DFOperations');
const CYSOperations = require('./CYSOperations');
const { EmailDateAsset } = require("../utils/utilsFunctions");
const integrationsExceptionsModel = require("../models/integrationsExceptionsModel");
const { getServiceWorkOrdersAndStatus, getServiceProviderName, getAllStatusFromWorkOrderLifeCycleForEmailNotifications } = require("../utils/general");
const integrationsCronsModel = require("../models/integrationsCronsModel");
const integrationsMasterModel = require("../models/integrationsMasterModel");
const CPDWorkordersModel = require("../models/CPDWorkordersModel");
const { oneWeekWorkOrderEmailNotifcation } = require("../emailNotifications/workOrdersEmailNotifications");
const fs = require('fs');
const accountsModel = require('../models/accountsModel');
const { sendWorkOrderEmail } = require('../emailNotifications/sendWorkOrderEmails');
const integrationsSettingsModel = require('../models/integrationsSettingsModel');

const schedulerIntegrationCronJobs = async (integrationObject) => {
    try {
        let schedulePeriodType = integrationObject.periodType;
        let scheduleInterval = integrationObject.periodSettings.interval;
        let lastPullTime = new Date(integrationObject.integrationsMasterId.lastPullDate);
        let scheduleTime = 0;
        let currentTime = new Date();

        if (schedulePeriodType === 'each second') {
            scheduleTime = (currentTime - lastPullTime) / 1000;
        } else if (schedulePeriodType === 'once each minute') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60);
            console.log('scheduleTime:===',scheduleTime)
        } else if (schedulePeriodType === 'once each hour') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60 * 60);
        } else if (schedulePeriodType === 'once each day') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60 * 60 * 24);
        } else if (schedulePeriodType === 'once each month') {
            scheduleTime = (currentTime - lastPullTime) / (1000 * 60 * 60 * 24 * 30);
        }

        if (Math.round(scheduleTime) >= scheduleInterval) {
            if (integrationObject.integrationsMasterId.status === 'active' && integrationObject.integrationsMasterId.from === 'CPD' && integrationObject.integrationsMasterId.to === 'DF') {
                const CPDCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "CPD" }).lean();
                await CPDOperations.getCPDWorkOrders(CPDCredentials, typeOfCron = "automated");

                const DFCredentials = await integrationsFieldMappingModel.find({ integrationsMasterId: integrationObject.integrationsMasterId, to: "DF" }).lean();
                await DFOperations.DFCreateWorkorders(DFCredentials, typeOfCron = "automated");
            } else if (integrationObject.integrationsMasterId.status === 'active' && integrationObject.integrationsMasterId.from === 'DF' && integrationObject.integrationsMasterId.to === 'CPD') {
                await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "DF" }).lean();
            } else if (integrationObject.integrationsMasterId.status === 'active' && integrationObject.integrationsMasterId.from === 'CPD' && integrationObject.integrationsMasterId.to === 'CYS') {
                const CPDCredentials = await integrationsMasterServiceProvidersModel.findOne({ integrationsMasterId: integrationObject.integrationsMasterId, serviceProvider: "CPD" }).lean();
                await CPDOperations.getCPDWorkOrders(CPDCredentials, typeOfCron = "automated");

                const CYSCredentials = await integrationsFieldMappingModel.find({ integrationsMasterId: integrationObject.integrationsMasterId, to: "CYS" }).lean();
                await CYSOperations.CYSCreateWorkorders(CYSCredentials, typeOfCron = "automated");
            }
            else {
                // nothing
            }
        }
        else{
            console.log('ScheduleTime is less than scheduleInterval')
        }
    } catch (error) {
        console.error('Error in schedulerIntegrationCronJobs:', error);
    }
};


const schedulerEmailJobs = async (integrationDetails, currentDateAndTime, accountLogo) => {
    let allIntegrationDetailsHtml = '';
    let workOrdersToDate
    let workOrdersFromDate
    let formattedFromDate = moment(currentDateAndTime).subtract(6, 'days').startOf('day');
    let formattedToDate  = moment(currentDateAndTime).endOf('day')

    for (let integration of integrationDetails) {
      let integrationsMasterId = integration.integrationsMasterId;
      console.log("integrationsMasterId:==", integrationsMasterId);
      let arr = []
      let integrationSourceAndDestinationStatus = {};
      let presentWeekData = EmailDateAsset(currentDateAndTime);
      
      workOrdersFromDate = moment(formattedFromDate).format('dddd, MMM DD YYYY')
      workOrdersToDate = moment(formattedToDate).format('dddd, MMM DD YYYY')
      
      let integrationsStatusFromSettings = await integrationsSettingsModel.findOne({integrationsMasterId:integrationsMasterId})
      // Integration exception count for last 7 days
      const integrationsExceptionsCount = await integrationsExceptionsModel.find({ integrationsMasterId: integrationsMasterId }).countDocuments();
     for (let week of presentWeekData) {
        let fromDate = new Date(week.fromDate);
        let toDate = new Date(week.toDate);
        
        let presentWeekIntegrationExceptions = await integrationsExceptionsModel.find({ integrationsMasterId, createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) } });
        let presentWeekIntegrationActivityLog = await integrationsCronsModel.find({ integrationsMasterId, createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) } });
  
        week.integrationsExceptionsCount = presentWeekIntegrationExceptions.length > 0 ? presentWeekIntegrationExceptions.length : 0;
        week.integrationsActivityLogCount = presentWeekIntegrationActivityLog.length > 0 ? presentWeekIntegrationActivityLog.length : 0;
      }
  
      let sourceWorkOrdersAndStatus = await getAllStatusFromWorkOrderLifeCycleForEmailNotifications(integration.accountId, integrationsMasterId, integration.from, formattedFromDate, formattedToDate);
      let destinationWorkOrdersAndStatus = await getAllStatusFromWorkOrderLifeCycleForEmailNotifications(integration.accountId, integrationsMasterId, integration.to, formattedFromDate, formattedToDate);
      
      integrationSourceAndDestinationStatus = {
        sourceStatus: [...sourceWorkOrdersAndStatus],
        destinationStatus: [...destinationWorkOrdersAndStatus]
      };
      let sourceStatusTotalCount = sourceWorkOrdersAndStatus.reduce((currentValue,statusCount)=>{
        return currentValue + statusCount.count
      },0);
      let destinationStatusTotalCount = destinationWorkOrdersAndStatus.reduce((currentValue,statusCount)=>{
        return currentValue + statusCount.count
      },0)
      let sourceServiceProviderName = await getServiceProviderName(integration.from)
      let destinationServiceProviderName = await getServiceProviderName(integration.to)
    //   console.log('integrationSourceAndDestinationStatus:==', integrationSourceAndDestinationStatus);
      console.log("arr:==",arr)
      const failedCPDWorkOrders = await CPDWorkordersModel.find({ integrationsMasterId: integrationsMasterId, status: "initiated", createdAt:{$gte:new Date(formattedFromDate), $lte:new Date(formattedToDate)}}).countDocuments();
      
      const emailNotificationContent = `${await oneWeekWorkOrderEmailNotifcation(integration.from, integration.to, integrationSourceAndDestinationStatus, failedCPDWorkOrders, integrationsExceptionsCount, sourceStatusTotalCount, destinationStatusTotalCount, workOrdersFromDate, workOrdersToDate
                                        ,sourceServiceProviderName, destinationServiceProviderName, integration.title, integrationsStatusFromSettings.statusFieldMappingKeys)}`
      
      allIntegrationDetailsHtml += emailNotificationContent;
    }
    console.log('accountLogo:==',accountLogo) 
    const finalHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MDS Builders Inc Work Orders Report</title>
     <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 0;
        -webkit-text-size-adjust: none;
        width: 100% !important;
        -ms-text-size-adjust: none;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
      }

      .container {
        background-color: #ffffff;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        padding: 20px;
        text-align: center;
        max-width: 600px;
        width: 100%;
        display: inline;
      }

      .logo {
        width: 100px;
        margin: 0 auto 20px;
      }

      .title {
        font-size: 24px;
        margin-bottom: 10px;
      }

      .subtitle {
        color: #888888;
        margin-bottom: 30px;
        font-size: 20px;
      }

      .subtitlee {
        font-size: 18px;
        margin-bottom: 20px;
      }

      .int {
        text-align: left;
        font-size: 16px;
        margin-bottom: 20px;
      }

      .stats {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-around;
        margin-bottom: 30px;
      }

      .stat {
        background-color: #ffe0b2;
        border-radius: 5px;
        padding: 10px 20px;
        flex: 1 1 calc(33.33% - 20px);
        margin: 10px;
        max-width: calc(33.33% - 20px);
        box-sizing: border-box;
      }

      .stat.mds {
        background-color: #96bbe2;
      }

      .stat.failed {
        background-color: #ffcdd2;
      }

      .stat.exceptions {
        background-color: #ffebee;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
        padding-left: 10px;
      }

      th,
      td {
        padding: 10px;
        border: 1px solid #dddddd;
        text-align: center;
        white-space: normal;
        word-break: break-word;
      }

      th {
        background-color: #f4f4f4;
      }

      .button {
        display: inline-block;
        background-color: #007bff;
        color: #ffffff;
        padding: 10px 20px;
        border-radius: 5px;
        text-decoration: none;
        margin-bottom: 20px;
      }

      .footer {
        color: #888888;
        font-size: 12px;
      }

      @media (max-width: 600px) {
        .stats {
          flex-direction: column;
          align-items: center;
          display: flex;
          justify-content: space-around;
        }

        .stat {
          flex: 1 1 100%;
          max-width: 100%;
          display: inline;
          min-width: 275px;
        }

        .title,
        .subtitle,
        .subtitlee {
          font-size: 18px;
        }

        .int {
          font-size: 14px;
        }
      }
    </style>
    </head>
    <body>
        <div class="container">
            <div style="width:60%; margin:auto"><img style="width:30%; margin:auto" src="${accountLogo}" alt="Company Logo" class="logo"></div>
            <div class="title">Thank you for choosing our services!</div>
            <div class="subtitle">Last week work orders report<br>${workOrdersFromDate} to ${workOrdersToDate}</div>
            ${allIntegrationDetailsHtml}
            <div style = "margin:auto"><a href="${process.env.WEB_DOMAIN_NAME}" class="button ">View My Account</a></div>
            
            <div class="footer">Thanks for being a great customer.<br>&copy; Copyright 2024 DevRabbit IT Solutions, Inc. All Rights Reserved.</div>
        </div>
    </body>
    </html>
    `;
  
    // Write the combined HTML content to a file
    const fileName = 'example.html';
    fs.writeFile(fileName, finalHtml, (err) => {
      if (err) {
        console.error('Error writing to file:', err);
      } else {
        console.log('File has been created and content written!');
      }
    });

    await sendWorkOrderEmail(finalHtml)

}

module.exports = {
    schedulerIntegrationCronJobs,
    schedulerEmailJobs
};

