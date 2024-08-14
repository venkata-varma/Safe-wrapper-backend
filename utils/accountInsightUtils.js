const { default: mongoose } = require("mongoose")
const workOrderLifeCycleModel = require("../models/workOrderLifeCycleModel")
const CPDWorkordersModel = require("../models/CPDWorkordersModel")
const DFWorkOrdersModel = require("../models/DFWorkOrdersModel")
const SNOWWorkOrdersModel = require("../models/SNOWWorkOrdersModel")
const CYSWorkordersModel = require("../models/CYSWorkordersModel")


exports.sourceWorkOrderLifeCycleDetails = async (SourceOrDestination, integrationsQuery, priorityQuery, fromDateQuery, toDateQuery, searchQuery, validPriorities, accountId) => {
    //console.log("accountReports, integrationsQuery, priorityQuery,fromDateQuery,toDateQuery,searchQuery, validPriorities", accountReports, integrationsQuery, priorityQuery,fromDateQuery,toDateQuery,searchQuery, validPriorities)
    let sourceWorkOrderRecords;
    if (priorityQuery && !validPriorities.includes(priorityQuery)) {
        sourceWorkOrderRecords = []
        return sourceWorkOrderRecords
    } else {
        console.log("integrationFrom", SourceOrDestination)
        sourceWorkOrderRecords = await workOrderLifeCycleModel.aggregate([
            {
                $match: {
                    integrationsMasterId: new mongoose.Types.ObjectId(integrationsQuery),
                    accountId: new mongoose.Types.ObjectId(accountId),
                    serviceProvider: SourceOrDestination,

                }
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

            { $sort: { createdAt: 1 } },
            {
                $match: {
                    ...(fromDateQuery && {
                        createdAt: { $gte: fromDateQuery, $lte: toDateQuery }
                    })
                }
            }

        ]);


        // Step 2: Fetch details from the appropriate model based on serviceProvider
        let workOrderDetailsPromises = sourceWorkOrderRecords.map(async (record) => {
            let workOrderDetail;
            let priorityFilter = {}; // Empty filter by default
            let searchFilter;
            // Apply priorityQuery if it exists and is not 'all'
            if (priorityQuery && priorityQuery !== 'all') {
                priorityFilter.priority = priorityQuery;
            }
            switch (record.serviceProvider) {
                case 'CPD':
                    // Define search query filter
                    searchFilter = searchQuery ? { $or: [{ "CPDWorkOrders.WorkOrderNumber": searchQuery },{ "CPDWorkOrders.WorkOrderId":searchQuery } ] } : {};
                    workOrderDetail = await CPDWorkordersModel.findOne({ CPDWorkOrderId: record.workOrderId, ...priorityFilter, ...searchFilter });
                    break;
                case 'DF':
                    searchFilter = searchQuery ? { $or: [{ "DFWorkOrders.id":searchQuery }, { "DFWorkOrders.numberAlt":searchQuery }] } : {};
                    workOrderDetail = await DFWorkOrdersModel.findOne({ DFWorkOrderId: record.workOrderId, ...priorityFilter, ...searchFilter });
                    break;
                case 'SNOW':
                    searchFilter = searchQuery ? { "SNOWWorkOrders.number": searchQuery } : {};
                    workOrderDetail = await SNOWWorkOrdersModel.findOne({ SNOWWorkOrderId: record.workOrderId, ...priorityFilter ,   ...searchFilter,});
                    break;
                case 'CYS':
                    searchFilter = searchQuery ? { CYSWorkOrderId: searchQuery  } : {};
                    workOrderDetail = await CYSWorkordersModel.findOne({ CYSWorkOrderId: record.workOrderId, ...priorityFilter,  ...searchFilter });
                    break;
                default:
                    // Handle unknown service provider
                    throw new Error(`Unknown service provider: ${record.serviceProvider}`);
            }

if(workOrderDetail!==null) {
    return {
        ...record,
        workOrderDetail
    }};

        });

        // // Step 3: Await all promises to get the final results
        let workOrderDetails = await Promise.all(workOrderDetailsPromises);
        workOrderDetails = workOrderDetails.filter(item => item !== null);
        
        return workOrderDetails;
        //return sourceWorkOrderRecords


    }

}




