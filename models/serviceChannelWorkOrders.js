const mongoose = require('mongoose')

const serviceChannelWorkOrdersSchema = new mongoose.Schema({
    registrationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"registration"
    },
    WorkOrderId:{
        type:Number
    },
    workOrders:{
        type:mongoose.Schema.Types.Mixed
    },
    corrigoProworkOrderStatus:{
        type:String,
        default:"new"
    },
    status:{
        type:String,
        enum:["initiated","pending","completed","error"],
        default:"initiated"
    },
    cronJobId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"cronjobs"
    },
    serviceChannelWorkOrderId:{
        type:Number
    },
    errorMessage:{
        type:String,
        default:null
    }
},{timestamps:true});

module.exports = mongoose.model('serviceChannelWorkOrders',serviceChannelWorkOrdersSchema)