const CPDWorkordersModel = require("../models/workOrdersModels/CPDWorkordersModel");
const serviceProviderListModel = require('../models/integrationsMasterModels/serviceProviderList')
const { dateAsset } = require("./utilsFunctions");
const mongoose = require('mongoose')
const DFWorkOrdersModel = require("../models/workOrdersModels/DFWorkOrdersModel");

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
    let serviceWorkOrdersAndStatus = {presentWeekData : dateAsset}
    if(serviceProvider === "CPD"){
        serviceWorkOrdersAndStatus.sourceWorkOrders = await CPDWorkordersModel.find({ integrationsMasterId }).populate("integrationsCronId");
        for (let week of presentWeekData) {
          presentWeekSourceData = await CPDWorkordersModel.find({ integrationsMasterId, createdAt: { $gte: new Date(week.fromDate), $lte: new Date(week.toDate) } });
          week.sourceWorkOrdersCount = presentWeekSourceData.length;
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
              _id: '$CPDWorkOrders.Status',
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
        serviceWorkOrdersAndStatus.destinationWorkOrders = await DFWorkOrdersModel.find({ integrationsMasterId }).populate("integrationsCronId");

        for (let week of presentWeekData) {
          presentWeekDestinationData = await DFWorkOrdersModel.find({ integrationsMasterId, createdAt: { $gte: week.fromDate, $lte: week.toDate } });
          week.destinationWorkOrdersCount = presentWeekDestinationData.length;
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
}


module.exports = {
    getServiceWorkOrdersAndStatus
}