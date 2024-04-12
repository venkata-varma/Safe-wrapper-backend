const {workOrdersIntegrations,invoicesIntegrations} = require('../cronJobs/cronjobs')

module.exports.handler = async(event, context,callback)=>{

    workOrdersIntegrations()
    invoicesIntegrations()
    callback(null)
};