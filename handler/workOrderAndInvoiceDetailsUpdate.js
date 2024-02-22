const {workOrderAndInvoiceDetailsUpdate,invoicesUpdate} = require('../cronJobs/cronjobs')

module.exports.handler = async(event, context,callback)=>{

    workOrderAndInvoiceDetailsUpdate()
    invoicesUpdate()
    callback(null)
};