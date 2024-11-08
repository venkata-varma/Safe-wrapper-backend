const CPDWorkordersModel = require("../models/CPDWorkordersModel");
const serviceProviderListModel = require('../models/serviceProviderList')
const { dateAsset } = require("./utilsFunctions");
const mongoose = require('mongoose')
const DFWorkOrdersModel = require("../models/DFWorkOrdersModel");
const SNOWWorkOrdersModel = require("../models/SNOWWorkOrdersModel");
const CYSWorkordersModel = require("../models/CYSWorkordersModel");
const workOrderLifeCycleModel = require("../models/workOrderLifeCycleModel");
const integrationsMasterModel = require("../models/integrationsMasterModel");
const fieldMappingsMasterModel = require("../models/fieldMappingsMasterModel");
const integrationsMasterServiceProvidersModel = require("../models/integrationsMasterServiceProvidersModel");
const serviceProviderCongiguration = require('../config/integrationsConfiguration');
const { CPDAuthentication } = require("./serviceProvidersAuthentication");
const { decryptData } = require("./encryptionAlgorithms");
const { default: axios } = require("axios");

var presentWeekSourceData = [];

const getStatusOfWorkOrders = async (workOrderStatus,getStatus) =>{
    
    let allStatuses = workOrderStatus.map(status => {
        const match = getStatus.find(item => item.status === status);
        return {
          status,
          count: match ? match.count : 0
        };
      });
      return allStatuses
} 

const getServiceWorkOrdersAndStatus = async(integrationsMasterId, serviceProvider, presentWeekData) => {
    let serviceWorkOrdersAndStatus = {presentWeekData : dateAsset()};
    let tempResultArray = new Array;

    if(serviceProvider === "CPD"){
        serviceWorkOrdersAndStatus.sourceWorkOrders = await CPDWorkordersModel.find({ integrationsMasterId }).populate("integrationsCronId").sort({_id:-1}).limit(15);
        // console.log('serviceWorkOrdersAndStatus.sourceWorkOrders:===',serviceWorkOrdersAndStatus.sourceWorkOrders)
        if(serviceWorkOrdersAndStatus.sourceWorkOrders.length > 0){
          let i=0;
            for (let week of presentWeekData) {  
                presentWeekSourceData = await CPDWorkordersModel.find({ integrationsMasterId, createdAt: { $gte: new Date(week.fromDate), $lte: new Date(week.toDate) } });
                week.sourceWorkOrdersCount = presentWeekSourceData.length > 0 ? presentWeekSourceData.length : 0;
                serviceWorkOrdersAndStatus.presentWeekData[i] = week;
                i++;
            }
        }

        const getDefaultStatus = await serviceProviderListModel.findOne({ serviceProviders: serviceProvider })
        let sourceStatus = await CPDWorkordersModel.aggregate([
          {
            $match: {
              integrationsMasterId: new mongoose.Types.ObjectId(integrationsMasterId),
            }
          },
          {
            $group: {
              _id: '$CPDWorkOrderStatus',
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              _id: 0,
              status: '$_id',
              count: 1
            }
          }
        ]);
        serviceWorkOrdersAndStatus.statuses = await getStatusOfWorkOrders(getDefaultStatus.workOrderStatus,sourceStatus);
        
        return serviceWorkOrdersAndStatus;
    }
    else if(serviceProvider === "DF"){
        serviceWorkOrdersAndStatus.destinationWorkOrders = await DFWorkOrdersModel.find({ integrationsMasterId }).populate("integrationsCronId").sort({_id:-1}).limit(15);
        if(serviceWorkOrdersAndStatus.destinationWorkOrders.length > 0){
            for (let week of presentWeekData) {
                presentWeekDestinationData = await DFWorkOrdersModel.find({ integrationsMasterId, createdAt: { $gte: new Date(week.fromDate), $lte: new Date(week.toDate) } });
                week.destinationWorkOrdersCount = presentWeekDestinationData.length >= 0 ? presentWeekDestinationData.length : 0;

              }
        }
       
        const getDefaultStatus = await serviceProviderListModel.findOne({ serviceProviders: serviceProvider })
        let destinationStatus = await DFWorkOrdersModel.aggregate([
          {
            $match: {
              integrationsMasterId: new mongoose.Types.ObjectId(integrationsMasterId),
            }
          },
          {
            $group: {
              _id: '$DFWorkOrderStatus',
              count: { $sum: 1 }
            }
          },
          {
            $project: {
              _id: 0,
              status: '$_id',
              count: 1
            }
          }
        ]);
        // const statuses = getDefaultStatus.workOrderStatus;
        // serviceWorkOrdersAndStatus.destination = statuses.map(status => {
        //   const match = destinationStatus.find(item => item.status === status);
        //   return {
        //     status,
        //     count: match ? match.count : 0
        //   };
        // });
        serviceWorkOrdersAndStatus.statuses = await getStatusOfWorkOrders(getDefaultStatus.workOrderStatus,destinationStatus);
       return serviceWorkOrdersAndStatus;
    }
    else if(serviceProvider === "SNOW"){
      serviceWorkOrdersAndStatus.destinationWorkOrders = await SNOWWorkOrdersModel.find({ integrationsMasterId }).populate("integrationsCronId").sort({_id:-1}).limit(15);
      if(serviceWorkOrdersAndStatus.destinationWorkOrders.length > 0){
          for (let week of presentWeekData) {
              presentWeekDestinationData = await SNOWWorkOrdersModel.find({ integrationsMasterId, createdAt: { $gte: new Date(week.fromDate), $lte: new Date(week.toDate) } });
              week.destinationWorkOrdersCount = presentWeekDestinationData.length >= 0 ? presentWeekDestinationData.length : 0;

            }
      }
     
      const getDefaultStatus = await serviceProviderListModel.findOne({ serviceProviders: serviceProvider })
      let destinationStatus = await SNOWWorkOrdersModel.aggregate([
        {
          $match: {
            integrationsMasterId: new mongoose.Types.ObjectId(integrationsMasterId),
          }
        },
        {
          $group: {
            _id: '$SNOWWorkOrderStatus',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            _id: 0,
            status: '$_id',
            count: 1
          }
        }
      ]);
      // const statuses = getDefaultStatus.workOrderStatus;
      // serviceWorkOrdersAndStatus.destination = statuses.map(status => {
      //   const match = destinationStatus.find(item => item.status === status);
      //   return {
      //     status,
      //     count: match ? match.count : 0
      //   };
      // });
      serviceWorkOrdersAndStatus.statuses = await getStatusOfWorkOrders(getDefaultStatus.workOrderStatus,destinationStatus);
     return serviceWorkOrdersAndStatus;
  }
  else if(serviceProvider === "CYS"){
    serviceWorkOrdersAndStatus.destinationWorkOrders = await CYSWorkordersModel.find({ integrationsMasterId }).populate("integrationsCronId").sort({_id:-1}).limit(15);
    if(serviceWorkOrdersAndStatus.destinationWorkOrders.length > 0){
        for (let week of presentWeekData) {
            presentWeekDestinationData = await CYSWorkordersModel.find({ integrationsMasterId, createdAt: { $gte: new Date(week.fromDate), $lte: new Date(week.toDate) } });
            week.destinationWorkOrdersCount = presentWeekDestinationData.length >= 0 ? presentWeekDestinationData.length : 0;

          }
    }
   
    const getDefaultStatus = await serviceProviderListModel.findOne({ serviceProviders: serviceProvider })
    let destinationStatus = await CYSWorkordersModel.aggregate([
      {
        $match: {
          integrationsMasterId: new mongoose.Types.ObjectId(integrationsMasterId),
        }
      },
      {
        $group: {
          _id: '$CYSWorkOrderStatus',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          status: '$_id',
          count: 1
        }
      }
    ]);
    // const statuses = getDefaultStatus.workOrderStatus;
    // serviceWorkOrdersAndStatus.destination = statuses.map(status => {
    //   const match = destinationStatus.find(item => item.status === status);
    //   return {
    //     status,
    //     count: match ? match.count : 0
    //   };
    // });
    serviceWorkOrdersAndStatus.statuses = await getStatusOfWorkOrders(getDefaultStatus.workOrderStatus,destinationStatus);
   return serviceWorkOrdersAndStatus;
}


}

// Function to return default field mapping keys based of "from" .
const defaultSatusMappingKeys = async (from, serviceMethod) => {
  let statusMappingDetails = await fieldMappingsMasterModel.find({serviceProvider:from, serviceType:{$in:['work-order','work-order-status']}, serviceMethod:serviceMethod})
  return statusMappingDetails
}

const getDefaultDestinationStatusMappingkeys = async(to, serviceMethod) =>{
  let defaultDestinationStatusMappingkeys = await fieldMappingsMasterModel.find({serviceProvider:to, serviceMethod:serviceMethod, serviceType:{$in:["work-orders"]}})
  return defaultDestinationStatusMappingkeys
}

/**
 * Function to return Status field mapping keys based on "from" & "to"
 * @params integrationMasterId
 * Function to be in step-5 of "Create Integration" process
  */
const getStatusFieldMappings = async(integrationMasterId) => {
  const integrationMaster = await integrationsMasterModel.findById(integrationMasterId);
  let statusFieldMappingKeys, requiredKeys
  if (integrationMaster.from === "CPD" && integrationMaster.to === "DF") {
      requiredKeys = {
      "numberAlt": "WorkOrderNumber",
      "budgetedProposedStatus": "NONE",
      "buildingId": "ServiceLocation.OccupantID",
      "invoiceToCustomerId": 2238,
      "invoiceType": "EXTERNAL_CHARGE",
      "reportedById": 5515,
      "workDescription": "WorkDetails.Assets[0].Comment"
    }
    statusFieldMappingKeys = {
      "REPORTED": "New",
      "ESTIMATE-REQUESTED": "Accepted",
      "ESTIMATE-COMPLETED": "Verified",
      "ON-HOLD": "OnHold",
      "SCHEDULED": "CheckedIn",
      "COMPLETED": "CheckedOut",
      "CANCELED": "Rejected",
      "IN-PROGRESS": "Paused"
    }
  } else if (integrationMaster.from === "CPD" && integrationMaster.to === "CYS") {
    requiredKeys = {}
    statusFieldMappingKeys = {
      "Hot": "New",
      "Approved": "Accepted",
      "Rejected": "Rejected",
      "Backordered": "Recalled",
      "Work-On": "CheckedIn",
      "Cold": "CheckedOut",
      "Service-In-Progress": "Paused",
      "Service-to-be-Scheduled": "OnHold",
      "Ready-to-Invoice": "Verified",
      "Pending-Info": "NeedsCompletionDetails"
    }
  }
  else if (integrationMaster.from === "CPD" && integrationMaster.to === "SNOW") {
    requiredKeys = {}
    statusFieldMappingKeys = {
      "1":"New",
      "2":"Accepted",
      "3":"Paused",
      "6":"CheckedIn",
      "7":"CheckedOut",
      "8":"Rejected"
    }
  }
  return {requiredKeys, statusFieldMappingKeys}
}


/**
 * Get the work order life cycle, source and destination of each work order by workOrderId.
 * Intially check wheather we have the sourceWorkOrderLifeCycleDetails for the input accountId, integrationsMasterId, workOrderId.
 * If length of the sourceWorkOrderLifeCycleDetails is greater than 0 get the source and destination of work orders.
 * If we have the sourceWorkOrderDetails for the respected input workOrderId then et the destinationWorkOrderDetails.
 * If not search for the respected input workOrderId in source and destination work orders.
 * If v length is less than 0 moves to else and then search for the input workOrderId have source and destination work orders.
 */
const getSourceAndDestinationWOLifeCycle = async (accountId, integrationsMasterId, from, to, workOrderId) => {
  let sourceWorkOrderDetails, destinationWorkOrderDetails;
  let sourceWorkOrderLifeCycleDetails = await workOrderLifeCycleModel.find({
    accountId,
    integrationsMasterId,
    workOrderId,
  });
  let destinationWorkOrderLifeCycleDetails;
  let errorMessage = '';



  const fetchWorkOrderDetails = async (model, query) => {
    return await model.findOne(query);
  };

  const fetchWorkOrderLifeCycleDetails = async (workOrderId) => {
    return await workOrderLifeCycleModel.find({
      accountId,
      integrationsMasterId,
      workOrderId,
    });
  };
  const handleError = (message) => {
    errorMessage = message;
    return errorMessage;
  };

  //If Input work order Id is Number type and of from source side
  if (sourceWorkOrderLifeCycleDetails.length > 0) {
    sourceWorkOrderDetails = await fetchWorkOrderDetails(CPDWorkordersModel, {
      accountId,
      integrationsMasterId,
      $expr: { $eq: [{ $toString: "$CPDWorkOrderId" },workOrderId]}
    });

    if (sourceWorkOrderDetails) {

      console.log('source workOrderId');
      if (from === 'CPD' && to === 'DF') {
        destinationWorkOrderDetails = await fetchWorkOrderDetails(DFWorkOrdersModel, {
          accountId,
          integrationsMasterId,
          'DFWorkOrders.numberAlt': sourceWorkOrderDetails.CPDWorkOrders.WorkOrderNumber,
        });
      } else if (from === 'CPD' && to === 'CYS') {
        destinationWorkOrderDetails = await fetchWorkOrderDetails(CYSWorkordersModel, {
          accountId,
          integrationsMasterId,
          'CYSWorkOrders.estimate.PONumber': sourceWorkOrderDetails.CPDWorkOrders.WorkOrderNumber,
        });
      }else if(from === 'CPD' && to === 'SNOW'){
        destinationWorkOrderDetails = await fetchWorkOrderDetails(SNOWWorkOrdersModel, {
          accountId,
          integrationsMasterId,
          'SNOWWorkOrders.user_input': sourceWorkOrderDetails.CPDWorkOrders.WorkOrderNumber,
        });
      }

      sourceWorkOrderLifeCycleDetails = await fetchWorkOrderLifeCycleDetails(sourceWorkOrderDetails.CPDWorkOrderId);
      destinationWorkOrderLifeCycleDetails = await fetchWorkOrderLifeCycleDetails(destinationWorkOrderDetails?.DFWorkOrderId || destinationWorkOrderDetails?.CYSWorkOrderId||destinationWorkOrderDetails?.SNOWWorkOrderId);
    } else {
      //If Input work order Id is Number type and of from Destination side
      console.log('destination WorkorderID');
      if (from === 'CPD' && to === 'DF') {
        destinationWorkOrderDetails = await fetchWorkOrderDetails(DFWorkOrdersModel, {
          accountId,
          integrationsMasterId,
          $expr: { $eq: [{ $toString: "$DFWorkOrderId" },workOrderId]}  ,
        });

        if (!destinationWorkOrderDetails) {
          return handleError('Invalid workorder id');
        }

        sourceWorkOrderDetails = await fetchWorkOrderDetails(CPDWorkordersModel, {
          accountId,
          integrationsMasterId,
          'CPDWorkOrders.WorkOrderNumber': destinationWorkOrderDetails.DFWorkOrders.numberAlt,
        });

        sourceWorkOrderLifeCycleDetails = await fetchWorkOrderLifeCycleDetails(sourceWorkOrderDetails.CPDWorkOrderId);
        destinationWorkOrderLifeCycleDetails = await fetchWorkOrderLifeCycleDetails(workOrderId);
      } else if (from === 'CPD' && to === 'CYS') {
        destinationWorkOrderDetails = await fetchWorkOrderDetails(CYSWorkordersModel, {
          accountId,
          integrationsMasterId,
          $expr: { $eq: [{ $toString: "$CYSWorkOrderId" },workOrderId]}  ,
        });

        if (!destinationWorkOrderDetails) {
          return handleError('Invalid workorder id');
        }

        sourceWorkOrderDetails = await fetchWorkOrderDetails(CPDWorkordersModel, {
          accountId,
          integrationsMasterId,
          "CPDWorkOrders.WorkOrderNumber": destinationWorkOrderDetails.CYSWorkOrders.estimate.PONumber
        });

        sourceWorkOrderLifeCycleDetails = await fetchWorkOrderLifeCycleDetails(sourceWorkOrderDetails.CPDWorkOrderId);
        destinationWorkOrderLifeCycleDetails = await fetchWorkOrderLifeCycleDetails(workOrderId);
      }else if(from === 'CPD' && to === 'SNOW'){
        destinationWorkOrderDetails = await fetchWorkOrderDetails(SNOWWorkOrdersModel, {
          accountId,
          integrationsMasterId,
          SNOWWorkOrderId: workOrderId,
        });

        if (!destinationWorkOrderDetails) {
          return handleError('Invalid workorder id');
        }

        sourceWorkOrderDetails = await fetchWorkOrderDetails(CPDWorkordersModel, {
          accountId,
          integrationsMasterId,
          $expr: { $eq: [{ $toString: "$CPDWorkOrderId" },destinationWorkOrderDetails.SNOWWorkOrders.order]} 
        });

        sourceWorkOrderLifeCycleDetails = await fetchWorkOrderLifeCycleDetails(sourceWorkOrderDetails.CPDWorkOrderId);
        destinationWorkOrderLifeCycleDetails = await fetchWorkOrderLifeCycleDetails(destinationWorkOrderDetails.SNOWWorkOrderId);
      }
    }
  } else {
    //If given input workOrderId is of type "String". Ex: "TMC.....", "CR....."
    console.log('source WorkOrderNumber');
    sourceWorkOrderDetails = await fetchWorkOrderDetails(CPDWorkordersModel, {
      accountId,
      integrationsMasterId,
      'CPDWorkOrders.WorkOrderNumber': workOrderId,
    });

    if (!sourceWorkOrderDetails) {
      return handleError('Invalid workorder id');
    }

    sourceWorkOrderLifeCycleDetails = await fetchWorkOrderLifeCycleDetails(sourceWorkOrderDetails.CPDWorkOrderId);

    if (from === 'CPD' && to === 'DF') {
      destinationWorkOrderDetails = await fetchWorkOrderDetails(DFWorkOrdersModel, {
        accountId,
        integrationsMasterId,
        'DFWorkOrders.numberAlt': workOrderId,
      });

      destinationWorkOrderLifeCycleDetails = await fetchWorkOrderLifeCycleDetails(destinationWorkOrderDetails?.DFWorkOrderId);
    } else if (from === 'CPD' && to === 'CYS') {
      destinationWorkOrderDetails = await fetchWorkOrderDetails(CYSWorkordersModel, {
        accountId,
        integrationsMasterId,
        'CYSWorkOrders.estimate.PONumber': workOrderId,
      });

      destinationWorkOrderLifeCycleDetails = await fetchWorkOrderLifeCycleDetails(destinationWorkOrderDetails?.CYSWorkOrderId);
    }else if(from === 'CPD' && to === 'SNOW'){
      destinationWorkOrderDetails = await fetchWorkOrderDetails(SNOWWorkOrdersModel, {
        accountId,
        integrationsMasterId,
        'SNOWWorkOrders.user_input':workOrderId,
      });

      destinationWorkOrderLifeCycleDetails = await fetchWorkOrderLifeCycleDetails(destinationWorkOrderDetails?.SNOWWorkOrderId);
    }
  }

  if (errorMessage) {
    return errorMessage;
  } else {
    return { sourceWorkOrderLifeCycleDetails, destinationWorkOrderLifeCycleDetails, sourceWorkOrderDetails, destinationWorkOrderDetails };
  }
};


const getServiceProviderName = async(serviceProviderName) => {
  if(serviceProviderName === 'CPD'){
    return "CorrigoPro"
  }
  else if(serviceProviderName === 'DF'){
    return "MDS Builders"
  }
  else if(serviceProviderName === 'SNOW'){
    return "Servicenow"
  }
  else if(serviceProviderName === 'CYS'){
    return "QSP Technologies"
  }
}




/**
 * Function where necessary functionality's code  is written 
 * @param aggregate
 * @returns Four new fields for each integration to distinguish between New work orders and updated ones among source work orders and destination work orders
 * 
 */
const integationOfAccountWorkOrderReports = async (workOrderReport) => {

  workOrderReport.forEach((integration) => {
      // Initialize group arrays with objects containing status and count
      integration.sourceWorkOrderStatusGroup = [];
      integration.destinationWorkOrderStatusGroup = [];

      // Initialize the new fields
      integration.sourceNewWorkOrdersCount = 0;
      integration.sourceUpdatedWorkOrdersCount = 0;
      integration.destinationNewWorkOrdersCount = 0;
      integration.destinationUpdatedWorkOrdersCount = 0;

      // Helper function to update status counts using reduce
      function updateStatusGroup(workOrderStatusGroup, workOrdersLifeCycle, serviceProvider) {
          return workOrdersLifeCycle.reduce((statusGroup, order) => {
              const statusField = order.serviceProvider === serviceProvider ? order.workOrderStatus : null;
              if (statusField) {
                  let statusObj = statusGroup.find(item => item.status === statusField);
                  if (statusObj) {
                      statusObj.count += 1;
                  } else {
                    statusGroup.push({ status: statusField, count: 1 });
                  }
              }
              return statusGroup;
          }, workOrderStatusGroup);
      }

      // Use map and reduce to populate sourceWorkOrderGroup and destinationWorkOrderGroup
      integration.sourceWorkOrderStatusGroup = updateStatusGroup(
          integration.sourceWorkOrderStatusGroup,
          integration.workorderlifecycles,
          integration.from
      );

      integration.destinationWorkOrderStatusGroup = updateStatusGroup(
          integration.destinationWorkOrderStatusGroup,
          integration.workorderlifecycles,
          integration.to
      );

      // Remove the workorderlifecycles array
      delete integration.workorderlifecycles;
      if (integration.statusFieldMappingKeys) {
          // Get the crucial status from statusFieldMappingKeys
          var serviceProviderNewStatus;
          switch (integration.from) {
              case 'CPD':
                  serviceProviderNewStatus = "new";
                  break;
              case 'DF':
                  serviceProviderNewStatus = "reported";
                  break;
              case 'SNOW':
                  serviceProviderNewStatus = "1";
                  break;
              case 'CYS':
                  serviceProviderNewStatus = "requested";
                  break;
          }

          var crucialSourceStatus, crucialDestinationStatus;
          const statusMapping = integration.statusFieldMappingKeys;
          for (let [key, value] of Object.entries(statusMapping)) {
              if (value.toLowerCase() === serviceProviderNewStatus) {
                  crucialSourceStatus = value;
                  crucialDestinationStatus = key;
              }
          }


          // Calculate sourceNewWorkOrdersCount and sourceUpdatedWorkOrders
          integration.sourceWorkOrderStatusGroup.forEach(statusObj => {
              if (statusObj.status === crucialSourceStatus) {
                  integration.sourceNewWorkOrdersCount = statusObj.count;
              } else {
                  integration.sourceUpdatedWorkOrdersCount += statusObj.count;
              }
          });

          // Calculate destinationNewWorkOrdersCount and destinationUpdatedWorkOrders
          integration.destinationWorkOrderStatusGroup.forEach(statusObj => {
              if (statusObj.status === crucialDestinationStatus) {
                  integration.destinationNewWorkOrdersCount = statusObj.count;
              } else {
                  integration.destinationUpdatedWorkOrdersCount += statusObj.count;
              }
          });
      }
  })
  return workOrderReport;
}

const getAllStatusFromWorkOrderLifeCycleForEmailNotifications = async(accountId,integrationsMasterId,serviceProvider,fromDate,toDate)=>{
  let workOrderStatusForEmail = await workOrderLifeCycleModel.aggregate([
    {
      $match:{
        accountId:accountId,
        integrationsMasterId: integrationsMasterId,
        serviceProvider:serviceProvider,
        createdAt:{$gte:new Date(fromDate), $lte:new Date(toDate)}
      }
    },
    {
      $group:{
        _id:"$workOrderStatus",
        count: { $sum: 1 } 
      }
    },
    {
      $project: {
        _id: 0,
        status: "$_id",
        count: 1
      }
    }
  ]);
  return workOrderStatusForEmail
}

const getCPDFullWorkOrderDetails = async(integrationsMasterId, workOrderDetails) => {

  const integrationObject = await integrationsMasterServiceProvidersModel.findOne({integrationsMasterId:integrationsMasterId, serviceProvider:"CPD"})
  // Find integration credentails and then decrypt and pull CPD calls.
  encrypted = { iv: process.env.CRYPTO_IV, encryptedData: integrationObject.credentials };
  decryptConfigCredentials = JSON.parse(await decryptData(encrypted, process.env.CRYPTO_KEY));
  const corrigoToken = await CPDAuthentication(decryptConfigCredentials.client_id, decryptConfigCredentials.client_secret, decryptConfigCredentials.grant_type, decryptConfigCredentials.baseUrl, integrationObject);

  let getCPDWorkOrderDetails = await axios.get(`${serviceProviderCongiguration.CPD.getWorkOrder.URL}messageId=${workOrderDetails.MessageId}&ids=${workOrderDetails.CPDWorkOrderId}`,
    {
        headers: { Authorization: `bearer ${corrigoToken}` }
    })
    .then(res => {
        // console.log('response:==',res.data)
        return res.data.WorkOrders[0]
    })
    .catch(async (error) => {
        console.log("ERROR:==", error)
        // await exceptionLogs(integrationObject, error.response.status, error.response.data.Message, error.name, error.config.data, "cpd-get-workorder", CPDWorkOrderId, CPDWorkOrderNumber, DFWorkOrderId)
    });
    return getCPDWorkOrderDetails
}

module.exports = {
  getServiceWorkOrdersAndStatus,
  getStatusOfWorkOrders,
  getStatusFieldMappings,
  getSourceAndDestinationWOLifeCycle,
  getServiceProviderName,
  defaultSatusMappingKeys,
  integationOfAccountWorkOrderReports,
  getAllStatusFromWorkOrderLifeCycleForEmailNotifications,
  getCPDFullWorkOrderDetails,
  getDefaultDestinationStatusMappingkeys
}