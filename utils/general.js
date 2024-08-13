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
      "Requested": "New",
      "Approved": "Accepted",
      "Cancelled": "Rejected",
      "Open": "Recalled",
      "Built": "CheckedIn",
      "Pending": "Paused",
      "Closed": "CheckedOut"
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
  let sourceWorkOrderDetails, destinationWorkOrderDetails
  let  sourceWorkOrderLifeCycleDetails = await workOrderLifeCycleModel.find({ accountId: accountId, integrationsMasterId: integrationsMasterId, workOrderId: workOrderId });
  let  destinationWorkOrderLifeCycleDetails
  console.log('sourceWorkOrderLifeCycleDetails:==',sourceWorkOrderLifeCycleDetails)
  if(sourceWorkOrderLifeCycleDetails.length > 0){
      sourceWorkOrderDetails = await CPDWorkordersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, CPDWorkOrderId: workOrderId })
      //Input workOrderId is source WorkOrderId
      if(sourceWorkOrderDetails){
        console.log('source workOrderId')
        if(from === 'CPD' && to === 'DF'){
          destinationWorkOrderDetails = await DFWorkOrdersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, "DFWorkOrders.numberAlt": sourceWorkOrderDetails.CPDWorkOrders.WorkOrderNumber })
          sourceWorkOrderLifeCycleDetails = await workOrderLifeCycleModel.find({accountId: accountId, integrationsMasterId: integrationsMasterId, workOrderId: sourceWorkOrderDetails.CPDWorkOrderId})
          destinationWorkOrderLifeCycleDetails = await workOrderLifeCycleModel.find({ accountId: accountId, integrationsMasterId: integrationsMasterId, workOrderId: destinationWorkOrderDetails.DFWorkOrderId });
        }
        else if(from === 'CPD' && to === 'CYS'){
          destinationWorkOrderDetails = await CYSWorkordersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, "CYSWorkOrders.estimate.PONumber": workOrderId })
          sourceWorkOrderLifeCycleDetails = await workOrderLifeCycleModel.find({accountId: accountId, integrationsMasterId: integrationsMasterId, workOrderId: sourceWorkOrderDetails.CPDWorkOrderId})
          destinationWorkOrderLifeCycleDetails = await workOrderLifeCycleModel.find({ accountId: accountId, integrationsMasterId: integrationsMasterId, workOrderId: destinationWorkOrderDetails.CYSWorkOrderId });
        }
      }
      //Input workOrderId is destination WorkorderID
      else{
        console.log('destination WorkorderID')
        if(from === 'CPD' && to === 'DF'){
          destinationWorkOrderDetails = await DFWorkOrdersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, DFWorkOrderId:workOrderId })
          sourceWorkOrderDetails = await CPDWorkordersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, "CPDWorkOrders.WorkOrderNumber": destinationWorkOrderDetails.DFWorkOrders.numberAlt })
          sourceWorkOrderLifeCycleDetails = await workOrderLifeCycleModel.find({accountId: accountId, integrationsMasterId: integrationsMasterId, workOrderId: sourceWorkOrderDetails.CPDWorkOrderId})
          destinationWorkOrderLifeCycleDetails = await workOrderLifeCycleModel.find({ accountId: accountId, integrationsMasterId: integrationsMasterId, workOrderId: workOrderId });
        }
        else if(from === 'CPD' && to === 'CYS'){
          destinationWorkOrderDetails = await CYSWorkordersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, CYSWorkOrderId: workOrderId })
          sourceWorkOrderDetails = await CPDWorkordersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, CPDWorkOrderId: destinationWorkOrderDetails.CYSWorkOrders.estimate.PONumber })
          sourceWorkOrderLifeCycleDetails = await workOrderLifeCycleModel.find({accountId: accountId, integrationsMasterId: integrationsMasterId, workOrderId: sourceWorkOrderDetails.CPDWorkOrderId})
          destinationWorkOrderLifeCycleDetails = await workOrderLifeCycleModel.find({ accountId: accountId, integrationsMasterId: integrationsMasterId, workOrderId: workOrderId });
        }
      }
    
  }
  //Input workOrderId is source WorkOrderNumber
  else{
    console.log('source WorkOrderNumber')

    sourceWorkOrderDetails = await CPDWorkordersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, "CPDWorkOrders.WorkOrderNumber": workOrderId })
    sourceWorkOrderLifeCycleDetails = await workOrderLifeCycleModel.find({ accountId: accountId, integrationsMasterId: integrationsMasterId, workOrderId: sourceWorkOrderDetails.CPDWorkOrderId });
      if(from === 'CPD' && to === 'DF'){
        destinationWorkOrderDetails = await DFWorkOrdersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, "DFWorkOrders.numberAlt": workOrderId })
        destinationWorkOrderLifeCycleDetails = await workOrderLifeCycleModel.find({ accountId: accountId, integrationsMasterId: integrationsMasterId, workOrderId: destinationWorkOrderDetails.DFWorkOrderId });
      }
      else if(from === 'CPD' && to === 'CYS'){
        destinationWorkOrderDetails = await CYSWorkordersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, "CYSWorkOrders.estimate.PONumber": sourceWorkOrderDetails.CPDWorkOrderId.toString() })
        destinationWorkOrderLifeCycleDetails = await workOrderLifeCycleModel.find({ accountId: accountId, integrationsMasterId: integrationsMasterId, workOrderId: destinationWorkOrderDetails.CYSWorkOrderId });
      }
  }
  return {sourceWorkOrderLifeCycleDetails, destinationWorkOrderLifeCycleDetails, sourceWorkOrderDetails, destinationWorkOrderDetails}
  
}

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


module.exports = {
  getServiceWorkOrdersAndStatus,
  getStatusOfWorkOrders,
  getStatusFieldMappings,
  getSourceAndDestinationWOLifeCycle,
  getServiceProviderName,
  defaultSatusMappingKeys
}