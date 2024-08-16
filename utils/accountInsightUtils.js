const { default: mongoose } = require("mongoose")
const workOrderLifeCycleModel = require("../models/workOrderLifeCycleModel")
const CPDWorkordersModel = require("../models/CPDWorkordersModel")
const DFWorkOrdersModel = require("../models/DFWorkOrdersModel")
const SNOWWorkOrdersModel = require("../models/SNOWWorkOrdersModel")
const CYSWorkordersModel = require("../models/CYSWorkordersModel")
const { sixWeekSales}=require('../utils/sixWeekSalesFunction')

exports.workOrderLifeCycleReports = async (SourceOrDestination, integrationsQuery, priorityQuery, fromDateQuery, toDateQuery, searchQuery, validPriorities, accountId) => {
    //console.log("accountReports, integrationsQuery, priorityQuery,fromDateQuery,toDateQuery,searchQuery, validPriorities", accountReports, integrationsQuery, priorityQuery,fromDateQuery,toDateQuery,searchQuery, validPriorities)
    let workOrderReports;
    if (priorityQuery && !validPriorities.includes(priorityQuery)) {
        workOrderReports = []
        return workOrderReports
    } else {
        console.log("integrationFrom", SourceOrDestination)
        workOrderReports = await workOrderLifeCycleModel.aggregate([
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
        let workOrderDetailsPromises = workOrderReports.map(async (record) => {
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

            if (workOrderDetail !== null) {
                return {
                    ...record,
                    workOrderDetail
                };
            } else {
                return null; // Explicitly return null for non-matching records
            }
        });

        // Step 3: Await all promises and filter out null values
        let workOrderDetails = await Promise.all(workOrderDetailsPromises);

        // Filter out null values
        workOrderDetails = workOrderDetails.filter(detail => detail !== null);

        return workOrderDetails;
    }

}


/**
 * 
 * 
 */
exports.sixWeeksSalesDetails=async(source,destination,integrationsQuery, accountId, statusFieldMappingKeys, integrationExceptions)=>{
var sixWeekSalesData=sixWeekSales
console.log("sixWeekSalesData", sixWeekSalesData)
    const workOrderLifeCycleDetails=await workOrderLifeCycleModel.aggregate([
        {
            $match:{
                integrationsMasterId:new mongoose.Types.ObjectId(integrationsQuery),
                accountId:new mongoose.Types.ObjectId(accountId),
                $or:[{serviceProvider:source}, {serviceProvider:destination}]
            }
        }
    ])
    

    const processSalesData = (source, destination, sixWeeksSalesData, integrationExceptions) => {
        return sixWeeksSalesData.map(week => {
            var { fromDate, toDate } = week;
            var sourceWorkOrderLifeCycleRecords = [];
            var destinationWorkOrderLifeCycleRecords = [];
var  integrationExceptionsRecordsPerWeek=[]

    var integrationExceptionsCount=0;
            workOrderLifeCycleDetails.forEach(record => {
                const createdAt = new Date(record.createdAt);
                if (createdAt >= new Date(fromDate) && createdAt <= new Date(toDate)) {
                    if (record.serviceProvider === source) {
                        sourceWorkOrderLifeCycleRecords.push(record);
                    }
                    if (record.serviceProvider === destination) {
                        destinationWorkOrderLifeCycleRecords.push(record);
                    }
                }
            });

            integrationExceptions.forEach(exception => {
                const exceptionCreatedAt = new Date(exception.createdAt);
                if (exceptionCreatedAt >= new Date(fromDate) && exceptionCreatedAt <= new Date(toDate)) {
                    integrationExceptionsRecordsPerWeek.push(exception);
                }
            });
    
            integrationExceptionsCount = integrationExceptionsRecordsPerWeek.length;
    


            
            return {
                fromDate,
                toDate,
                sourceWorkOrderLifeCycleRecords,
                destinationWorkOrderLifeCycleRecords, 
                integrationExceptionsRecordsPerWeek, 
                integrationExceptionsCount
            };
        });
    };
    
    // Example usage
    const result = processSalesData(source, destination, sixWeekSalesData, integrationExceptions);
    //console.log(result);



    return result
}


exports.mapNewUpdatedCounts = async (sixWeekLifeCycleDocs, statusFieldMappingKeys, source, destination) => {
    console.log("statusFieldMappingKeys", statusFieldMappingKeys);
    
    var serviceProviderNewStatus;
    switch (source) {
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
    for (let [key, value] of Object.entries(statusFieldMappingKeys)) {
        if (value.toLowerCase() === serviceProviderNewStatus) {
            crucialSourceStatus = value;
            crucialDestinationStatus = key;
        }
    }

    console.log("crucialSourceStatus, crucialDestinationStatus", crucialSourceStatus, crucialDestinationStatus);

    // Loop through each week in workOrderLifeCycleDocs
    sixWeekLifeCycleDocs = sixWeekLifeCycleDocs.map((week) => {
        let sourceNewWorkOrdersCount = 0;
        let sourceUpdatedWorkOrdersCount = 0;
        let destinationNewWorkOrdersCount = 0;
        let destinationUpdatedWorkOrdersCount = 0;

        // Count new and updated orders for source
        week.sourceWorkOrderLifeCycleRecords.forEach(order => {
            if (order.workOrderStatus.toLowerCase() === crucialSourceStatus.toLowerCase()) {
                sourceNewWorkOrdersCount++;
            } else {
                sourceUpdatedWorkOrdersCount++;
            }
        });

        // Count new and updated orders for destination
        week.destinationWorkOrderLifeCycleRecords.forEach(order => {
            if (order.workOrderStatus.toLowerCase() === crucialDestinationStatus.toLowerCase()) {
                destinationNewWorkOrdersCount++;
            } else {
                destinationUpdatedWorkOrdersCount++;
            }
        });
delete week.sourceWorkOrderLifeCycleRecords;
delete week.destinationWorkOrderLifeCycleRecords;

        // Add the new fields to each week
        return {
            ...week,
            sourceNewWorkOrdersCount,
            sourceUpdatedWorkOrdersCount,
            destinationNewWorkOrdersCount,
            destinationUpdatedWorkOrdersCount
        };
    });

    return sixWeekLifeCycleDocs;
}
