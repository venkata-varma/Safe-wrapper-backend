const mongoose = require('mongoose');

const serviceChannelInvoiceSchema = mongoose.Schema({
    registrationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"registration"
    },
    corrigoProWorkOrderId:{
        type:Number,
        default:null
    },
    invoiceDetails:{
        type:mongoose.Schema.Types.Mixed
    },
    MessageId: { type: String },
    cronJobId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"cronjobs"
    },
    serviceChannelInvoiceNumber:{
        type:Number
    },
    status:{
        type:String,
        enum:["initiated","pending","completed","error"],
        default:"initiated"
    },
    errorMessage:{
        type:String,
        default:null
    }
},{ timestamps: true });

module.exports = mongoose.model('servicechannelinvoice',serviceChannelInvoiceSchema)