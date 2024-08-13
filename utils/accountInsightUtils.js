const { default: mongoose } = require("mongoose")
const workOrderLifeCycleModel=require("../models/workOrderLifeCycleModel")


exports.sourceWorkOrderLifeCycleDetails=async(accountReports, integrationsQuery, priorityQuery,fromDateQuery,toDateQuery,searchQuery, validPriorities, accountId)=>{
//console.log("accountReports, integrationsQuery, priorityQuery,fromDateQuery,toDateQuery,searchQuery, validPriorities", accountReports, integrationsQuery, priorityQuery,fromDateQuery,toDateQuery,searchQuery, validPriorities)
accountReports.forEach(async(integrationMaster)=>{
    console.log(integrationMaster.from, integrationMaster.to)
let sourceWorkOrderRecords=await workOrderLifeCycleModel.find({integrationsMasterId:new mongoose.Types.ObjectId(integrationsQuery), accountId, serviceProvider:integrationMaster.from})
console.log("sourceWorkOrderRecords", sourceWorkOrderRecords)

})

}



exports.destinationWorkOrderLifeCycleDetails=async(accountReports, integrationsQuery, priorityQuery,fromDateQuery,toDateQuery,searchQuery, validPriorities)=>{
 
    

}