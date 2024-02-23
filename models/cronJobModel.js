const mongoose = require('mongoose')

const cronJobsSchema = new mongoose.Schema({
    date_created:{
        type:Date,
        dafault:new Date()
    },
    registrationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"registration",
        default:null
    },
    integrationId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"integrations",
        default:null
    },
    cronjobType:{
        type:String,
        enum:["manual",'cron-job'],
        default:""
    },
    corrigo_pull_newWorkOrders:{
        type:Number,
        default:0
    },
    serviceChannel_push_newWorkorders:{
        type:Number,
        default:0
    },
    corrigo_pull_newInvoice:{
        type:Number,
        default:0
    },
    serviceChannel_push_newInvoice:{
        type:Number,
        default:0
    },
    quick_books_push_newInvoices:{
        type:Number,
        default:0
    },
    status:{
        type:String,
        default:"initiated"
    }
},{timestamps:true});

module.exports = mongoose.model('cronjobs',cronJobsSchema)