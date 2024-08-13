const { default: mongoose } = require("mongoose")
const workOrderLifeCycleModel = require("../models/workOrderLifeCycleModel")


exports.sourceWorkOrderLifeCycleDetails = async (accountReports, integrationsQuery, priorityQuery, fromDateQuery, toDateQuery, searchQuery, validPriorities, accountId) => {
    //console.log("accountReports, integrationsQuery, priorityQuery,fromDateQuery,toDateQuery,searchQuery, validPriorities", accountReports, integrationsQuery, priorityQuery,fromDateQuery,toDateQuery,searchQuery, validPriorities)
    const integrationFrom=accountReports[0].from
console.log("integrationFrom", integrationFrom)
let sourceWorkOrderRecords = await workOrderLifeCycleModel.aggregate([
    {
        $match: {
            integrationsMasterId: new mongoose.Types.ObjectId(integrationsQuery),
            accountId:new mongoose.Types.ObjectId(accountId),
           serviceProvider:integrationFrom
        }
    },
    {
        $sort: { createdAt: 1 } // Sort by createdAt in ascending order
    },
    {
        $group: {
            _id: "$workOrderId", // Group by workOrderId
            doc: { $first: "$$ROOT" } // Select the first document for each workOrderId
        }
    },
    {
        $replaceRoot: { newRoot: "$doc" } // Replace the root with the grouped document
    },
    {
        $lookup: {
            from: "cpdworkorders",
            localField: "_id",
            foreignField: "integrationsMasterId",
            as: "CPDWorkOrders"
        }
    },
    {
        $lookup: {
            from: "dfworkorders",
            localField: "_id",
            foreignField: "integrationsMasterId",
            as: "DFWorkOrders"
        }
    },
    {
        $lookup: {
            from: "snowworkorders",
            localField: "_id",
            foreignField: "integrationsMasterId",
            as: "SNOWWorkOrders"
        }
    },
    {
        $lookup: {
            from: "cysworkorders",
            localField: "_id",
            foreignField: "integrationsMasterId",
            as: "CYSWorkOrders"
        }
    },
     
]);


}











exports.destinationWorkOrderLifeCycleDetails = async (accountReports, integrationsQuery, priorityQuery, fromDateQuery, toDateQuery, searchQuery, validPriorities, accountId) => {
    const integrationTo=accountReports[0].to
console.log("integrationFrom", integrationFrom)
let sourceWorkOrderRecords = await workOrderLifeCycleModel.aggregate([
    {
        $match: {
            integrationsMasterId: new mongoose.Types.ObjectId(integrationsQuery),
            accountId:new mongoose.Types.ObjectId(accountId),
           serviceProvider:integrationTo
        }
    },
    {
        $sort: { createdAt: 1 } // Sort by createdAt in ascending order
    },
    {
        $group: {
            _id: "$workOrderId", // Group by workOrderId
            doc: { $first: "$$ROOT" } // Select the first document for each workOrderId
        }
    },
    {
        $replaceRoot: { newRoot: "$doc" } // Replace the root with the grouped document
    }

     
]);




}