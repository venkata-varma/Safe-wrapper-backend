const { default: mongoose } = require("mongoose")
const workOrderLifeCycleModel = require("../models/workOrderLifeCycleModel")
const CPDWorkordersModel = require("../models/CPDWorkordersModel")
const DFWorkOrdersModel = require("../models/DFWorkOrdersModel")
const SNOWWorkOrdersModel = require("../models/SNOWWorkOrdersModel")
const CYSWorkordersModel = require("../models/CYSWorkordersModel")


exports.sourceWorkOrderLifeCycleDetails = async (SourceOrDestination, integrationsQuery, priorityQuery, fromDateQuery, toDateQuery, searchQuery, validPriorities, accountId) => {
    //console.log("accountReports, integrationsQuery, priorityQuery,fromDateQuery,toDateQuery,searchQuery, validPriorities", accountReports, integrationsQuery, priorityQuery,fromDateQuery,toDateQuery,searchQuery, validPriorities)

    console.log("integrationFrom", SourceOrDestination)
    let sourceWorkOrderRecords = await workOrderLifeCycleModel.aggregate([
        {
            $match: {
                integrationsMasterId: new mongoose.Types.ObjectId(integrationsQuery),
                accountId: new mongoose.Types.ObjectId(accountId),
                serviceProvider: SourceOrDestination,
                // ...(fromDateQuery && {
                //     $and: [
                //         { createdAt: { $gte: fromDateQuery } },
                //         { createdAt: { $lte: toDateQuery } }
                //     ]
                // })
            }
        },
        {
            $sort: { createdAt: -1 } // Sort by createdAt in ascending order
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


    ]);


    // Step 2: Fetch details from the appropriate model based on serviceProvider
    let workOrderDetailsPromises = sourceWorkOrderRecords.map(async (record) => {
        let workOrderDetail;

        switch (record.serviceProvider) {
            case 'CPD':
                workOrderDetail = await CPDWorkordersModel.findOne({ CPDWorkOrderId: record.workOrderId });
                break;
            case 'DF':
                workOrderDetail = await DFWorkOrdersModel.findOne({ DFWorkOrderId: record.workOrderId });
                break;
            case 'SNOW':
                workOrderDetail = await SNOWWorkOrdersModel.findOne({ SNOWWorkOrderId: record.workOrderId });
                break;
            case 'CYS':
                workOrderDetail = await CYSWorkordersModel.findOne({ CYSWorkOrderId: record.workOrderId });
                break;
            default:
                // Handle unknown service provider
                throw new Error(`Unknown service provider: ${record.serviceProvider}`);
        }

        return {
            ...record,
            workOrderDetail
        };
    });

    // // Step 3: Await all promises to get the final results
    // let workOrderDetails = await Promise.all(workOrderDetailsPromises);

    // return workOrderDetails;
return sourceWorkOrderRecords


}











exports.destinationWorkOrderLifeCycleDetails = async (accountReports, integrationsQuery, priorityQuery, fromDateQuery, toDateQuery, searchQuery, validPriorities, accountId) => {
    const integrationTo = accountReports[0].to
    console.log("integrationFrom", integrationFrom)
    let sourceWorkOrderRecords = await workOrderLifeCycleModel.aggregate([
        {
            $match: {
                integrationsMasterId: new mongoose.Types.ObjectId(integrationsQuery),
                accountId: new mongoose.Types.ObjectId(accountId),
                serviceProvider: integrationTo
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