const moment = require('moment')
const integrationsFieldMappingModel = require("../models/integrationsMasterModels/integrationsFieldMappingModel");
const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterModels/integrationsMasterServiceProvidersModel");
const CPDOperations = require('./CPDOperations');
const DFOperations = require('./DFOperations');
const CYSOperations = require('./CYSOperations');
const { EmailDateAsset } = require("../utils/utilsFunctions");
const integrationsExceptionsModel = require("../models/integrationsMasterModels/integrationsExceptionsModel");
const { getServiceWorkOrdersAndStatus, getServiceProviderName } = require("../utils/general");
const integrationsCronsModel = require("../models/integrationsMasterModels/integrationsCronsModel");
const integrationsMasterModel = require("../models/integrationsMasterModels/integrationsMasterModel");
const CPDWorkordersModel = require("../models/workOrdersModels/CPDWorkordersModel");
const { oneWeekWorkOrderEmailNotifcation } = require("../emailNotifications/workOrdersEmailNotifications");
const fs = require('fs');
const accountsModel = require('../models/accountsModels/accountsModel');
const { sendWorkOrderEmail } = require('../emailNotifications/sendWorkOrderEmails');

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


const schedulerEmailJobs = async (integrationDetails, currentDateAndTime) => {
    let allIntegrationDetailsHtml = '';
    let serviceProviderComapanyLogo 
    let workOrdersToDate
    let workOrdersFromDate
    for (let integration of integrationDetails) {
      let integrationsMasterId = integration.integrationsMasterId;
      console.log("integrationsMasterId:==", integrationsMasterId);
      let arr = []
      let integrationSourceAndDestinationStatus = {};
      let presentWeekData = EmailDateAsset(currentDateAndTime);
      workOrdersToDate = moment(new Date(presentWeekData[0].fromDate)).format('dddd, MMM DD YYYY')
      workOrdersFromDate = moment(new Date(presentWeekData[presentWeekData.length-1].toDate)).format('dddd, MMM DD YYYY')
      
      // Integration exception count for last 7 days
      const integrationsExceptionsCount = await integrationsExceptionsModel.find({ integrationsMasterId: integrationsMasterId }).countDocuments();
      serviceProviderComapanyLogo = await accountsModel.findById(integration.accountId)
      console.log('serviceProviderComapanyLogo:===',serviceProviderComapanyLogo.logo)
      for (let week of presentWeekData) {
        let fromDate = new Date(week.fromDate);
        let toDate = new Date(week.toDate);
        
        let presentWeekIntegrationExceptions = await integrationsExceptionsModel.find({ integrationsMasterId, createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) } });
        let presentWeekIntegrationActivityLog = await integrationsCronsModel.find({ integrationsMasterId, createdAt: { $gte: new Date(fromDate), $lte: new Date(toDate) } });
  
        week.integrationsExceptionsCount = presentWeekIntegrationExceptions.length > 0 ? presentWeekIntegrationExceptions.length : 0;
        week.integrationsActivityLogCount = presentWeekIntegrationActivityLog.length > 0 ? presentWeekIntegrationActivityLog.length : 0;
      }
  
      let sourceWorkOrdersAndStatus = await getServiceWorkOrdersAndStatus(integrationsMasterId, integration.from, presentWeekData);
      let destinationWorkOrdersAndStatus = await getServiceWorkOrdersAndStatus(integrationsMasterId, integration.to, presentWeekData);
      
      integrationSourceAndDestinationStatus = {
        sourceStatus: [...sourceWorkOrdersAndStatus.statuses],
        destinationStatus: [...destinationWorkOrdersAndStatus.statuses]
      };
      let sourceStatusTotalCount = sourceWorkOrdersAndStatus.statuses.reduce((currentValue,statusCount)=>{
        return currentValue + statusCount.count
      },0);
      let destinationStatusTotalCount = destinationWorkOrdersAndStatus.statuses.reduce((currentValue,statusCount)=>{
        return currentValue + statusCount.count
      },0)
      let sourceServiceProviderName = await getServiceProviderName(integration.from)
      let destinationServiceProviderName = await getServiceProviderName(integration.to)
    //   console.log('integrationSourceAndDestinationStatus:==', integrationSourceAndDestinationStatus);
      console.log("arr:==",arr)
      const failedCPDWorkOrders = await CPDWorkordersModel.find({ integrationsMasterId: integrationsMasterId, status: "initiated" }).countDocuments();
    //   console.log('failedCPDWorkOrders:===', failedCPDWorkOrders);
    //   console.log('integrationsExceptionsCount:===', integrationsExceptionsCount);
  
      const emailNotificationContent = `${await oneWeekWorkOrderEmailNotifcation(integration.from, integration.to, integrationSourceAndDestinationStatus, failedCPDWorkOrders, integrationsExceptionsCount, sourceStatusTotalCount, destinationStatusTotalCount, workOrdersFromDate, workOrdersToDate
                                        ,sourceServiceProviderName, destinationServiceProviderName, serviceProviderComapanyLogo.logo, integration.title)}`
      
      allIntegrationDetailsHtml += emailNotificationContent;
    }

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
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }

        .container {
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            width: 600px;
            padding: 20px;
            display:inline;
            text-align: center;
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
            font-size: 45px;
        }

        .stats {
            display: flex;
            justify-content: center;
            margin-bottom: 30px;
        }

        .stat {
            background-color: #ffe0b2;
            border-radius: 5px;
            padding: 10px 20px;
            width: 30%;
            margin: 4px;
        }

        .stat.mds {
            background-color: #2160a3;
            border-radius: 5px;
            padding: 10px 20px;
            width: 30%;
            margin: 4px;
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
        }

        th,
        td {
            padding: 10px;
            border: 1px solid #dddddd;
            text-align: center;
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

        .text-left {
            text-align: left;
        }
    </style>
    </head>
    <body>
        <div class="container">
            <div style="width:60%; margin:auto"><img style="width:30%; margin:auto" src= "${serviceProviderComapanyLogo.logo}" alt="Company Logo" class="logo"></div>
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

