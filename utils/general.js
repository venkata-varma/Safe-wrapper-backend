const CPDWorkordersModel = require("../models/workOrdersModels/CPDWorkordersModel");
const serviceProviderListModel = require('../models/integrationsMasterModels/serviceProviderList')
const { dateAsset } = require("./utilsFunctions");
const mongoose = require('mongoose')
const DFWorkOrdersModel = require("../models/workOrdersModels/DFWorkOrdersModel");
const SNOWWorkOrdersModel = require("../models/workOrdersModels/SNOWWorkOrdersModel");
const CYSWorkordersModel = require("../models/workOrdersModels/CYSWorkordersModel");
const workOrderLifeCycleModel = require("../models/workOrdersModels/workOrderLifeCycleModel");
const integrationsMasterModel = require("../models/integrationsMasterModels/integrationsMasterModel");

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


/**
 * Function to return Status field mapping keys based on "from" & "to"
 * @params integrationMasterId
 * Function to be in step-5 of "Create Integration" process
  */
const getStatusFieldMappings = async(integrationMasterId) => {
  const integrationMaster = await integrationsMasterModel.findById(integrationMasterId);

  if (integrationMaster.from === "CPD" && integrationMaster.to === "DF") {
    return {
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
    return {
      "Requested": "New",
      "Approved": "Accepted",
      "Cancelled": "Rejected",
      "Open": "Recalled",
      "Built": "CheckedIn",
      "Pending": "Paused",
      "Closed": "CheckedOut"
    }
  }
}


/**
 * Get the work order life cycle, source and destination of each work order by workOrderId.
 * Intially check wheather we have the workOrderLifeCycleDetails for the input accountId, integrationsMasterId, workOrderId.
 * If length of the workOrderLifeCycleDetails is greater than 0 get the source and destination of work orders.
 * If we have the sourceWorkOrderDetails for the respected input workOrderId then et the destinationWorkOrderDetails.
 * If not search for the respected input workOrderId in source and destination work orders.
 * If workOrderLifeCycleDetails length is less than 0 moves to else and then search for the input workOrderId have source and destination work orders.
 */
const getSourceAndDestinationWOLifeCycle = async (accountId, integrationsMasterId, from, to, workOrderId) => {
  let sourceWorkOrderDetails, destinationWorkOrderDetails
  let  workOrderLifeCycleDetails = await workOrderLifeCycleModel.find({ accountId: accountId, integrationsMasterId: integrationsMasterId, workOrderId: workOrderId });
  console.log('workOrderLifeCycleDetails:==',workOrderLifeCycleDetails)
  if(workOrderLifeCycleDetails.length > 0){
      sourceWorkOrderDetails = await CPDWorkordersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, CPDWorkOrderId: workOrderId })
      if(sourceWorkOrderDetails){
        if(from === 'CPD' && to === 'DF'){
          destinationWorkOrderDetails = await DFWorkOrdersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, "DFWorkOrders.numberAlt": sourceWorkOrderDetails.CPDWorkOrders.WorkOrderNumber })
        }
        else if(from === 'CPD' && to === 'CYS'){
          destinationWorkOrderDetails = await CYSWorkordersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, "CYSWorkOrders.estimate.PONumber": workOrderId })
        
        }
      }
      else{
        if(from === 'CPD' && to === 'DF'){
          destinationWorkOrderDetails = await DFWorkOrdersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, DFWorkOrderId:workOrderId })
          sourceWorkOrderDetails = await CPDWorkordersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, "CPDWorkOrders.WorkOrderNumber": destinationWorkOrderDetails.DFWorkOrders.numberAlt })
        }
        else if(from === 'CPD' && to === 'CYS'){
          destinationWorkOrderDetails = await CYSWorkordersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, CYSWorkOrderId: workOrderId })
          sourceWorkOrderDetails = await CPDWorkordersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, CPDWorkOrderId: destinationWorkOrderDetails.CYSWorkOrders.estimate.PONumber })
        }
      }
    
  }
  else{
    sourceWorkOrderDetails = await CPDWorkordersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, "CPDWorkOrders.WorkOrderNumber": workOrderId })
    workOrderLifeCycleDetails = await workOrderLifeCycleModel.find({ accountId: accountId, integrationsMasterId: integrationsMasterId, workOrderId: sourceWorkOrderDetails.CPDWorkOrderId });
      if(from === 'CPD' && to === 'DF'){
        destinationWorkOrderDetails = await DFWorkOrdersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, "DFWorkOrders.numberAlt": workOrderId })
      }
      else if(from === 'CPD' && to === 'CYS'){
        destinationWorkOrderDetails = await CYSWorkordersModel.findOne({ accountId: accountId, integrationsMasterId: integrationsMasterId, "CYSWorkOrders.estimate.PONumber": sourceWorkOrderDetails.CPDWorkOrderId  })
      }
  }
  return {workOrderLifeCycleDetails, sourceWorkOrderDetails, destinationWorkOrderDetails}
  
}




module.exports = {
  getServiceWorkOrdersAndStatus,
  getStatusOfWorkOrders,
  getStatusFieldMappings,
  getSourceAndDestinationWOLifeCycle,
}