const mongoose = require('mongoose');


const invoiceSchema = new mongoose.Schema({
    registrationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"registration",
        default:null
    },
    corrigoProWorkOrderId:{
        type:Number,
        default:null
    },
    invoiceDetails:{
        type:mongoose.Schema.Types.Mixed,
        default:{}
    },
    MessageId: { 
        type: String,
        default:""
     },
    cronJobId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"cronjobs",
        default:null
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

module.exports = mongoose.model('corrigoproinvoice', invoiceSchema);
