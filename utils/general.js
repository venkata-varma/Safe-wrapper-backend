const CPDWorkordersModel = require("../models/workOrdersModels/CPDWorkordersModel");
const serviceProviderListModel = require('../models/integrationsMasterModels/serviceProviderList')
const { dateAsset } = require("./utilsFunctions");
const mongoose = require('mongoose')
const DFWorkOrdersModel = require("../models/workOrdersModels/DFWorkOrdersModel");
const SNOWWorkOrdersModel = require("../models/workOrdersModels/SNOWWorkOrdersModel");
const CYSWorkordersModel = require("../models/workOrdersModels/CYSWorkordersModel");

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
module.exports = {
    getServiceWorkOrdersAndStatus,
    getStatusOfWorkOrders
}