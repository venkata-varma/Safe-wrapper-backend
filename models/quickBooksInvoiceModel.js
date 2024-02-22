const mongoose = require('mongoose');

const quickBooksInvoicesSchema = mongoose.Schema({
    registrationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"registration"
    },
    corrigoProWorkOrderId:{
        type:Number,
        default:null
    },
    quickBooksInvoiceDetails:{
        type:mongoose.Schema.Types.Mixed
    },
    MessageId: { type: String },
    cronJobId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"cronjobs"
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

module.exports = mongoose.model('quickbooksinvoices',quickBooksInvoicesSchema)