const mongoose = require('mongoose')


const workOrdersAndInvoicesKeysSchema = mongoose.Schema({
    registrationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"registrations",
        default:null
    },
    integrationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"integrations",
        default:null
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"user",
        default:null
    },
    typeOfService:{
        type:String,
        default:null
    },
    keys:{
        type:mongoose.Schema.Types.Mixed,
        default:null
    }
},{timestamps:true});

module.exports = mongoose.model('workordersandinvoiceskeys',workOrdersAndInvoicesKeysSchema)