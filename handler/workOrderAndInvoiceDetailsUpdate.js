const { workOrdersIntegrations, invoicesIntegrations } = require('../cronJobs/cronjobs')

module.exports.handler = async (event, context, callback) => {

    let date = new Date()
    let hours = date.getHours().toString()
    let minutes = date.getMinutes().toString()
    if (hours === "09" && minutes === "00") {
        workOrdersIntegrations()
        invoicesIntegrations()
    }
    callback(null)
};