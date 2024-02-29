const mongoose = require('mongoose')

const serviceChannelWorkOrdersSchema = new mongoose.Schema({
    registrationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"registrations",
        default:null
    },
    WorkOrderId:{
        type:Number,
        default:null
    },
    workOrders:{
        type:mongoose.Schema.Types.Mixed,
        default:{}
    },
    corrigoProworkOrderStatus:{
        type:String,
        default:"New"
    },
    status:{
        type:String,
        enum:["initiated","pending","completed","error"],
        default:"initiated"
    },
    cronJobId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"cronjobs",
        default:null
    },
    serviceChannelWorkOrderId:{
        type:Number,
        default:null
    },
    errorMessage:{
        type:String,
        default:null
    }
},{timestamps:true});

module.exports = mongoose.model('serviceChannelWorkOrders',serviceChannelWorkOrdersSchema)