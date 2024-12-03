const mongoose = require('mongoose')

const webHooksLogsSchema = new mongoose.Schema({
    webHookLogId: {
        type:mongoose.Schema.Types.ObjectId,
        default:null
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "accounts",
        index : true,
        default: null,
    },
    integrationsMasterId : { 
        type : mongoose.Schema.Types.ObjectId,
        ref : "integrationsMaster",
        index : true,
        default : null
    },
    webHookId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"webhooksmodel",
        default:null
    },
    dataObject:{
        type:mongoose.Schema.Types.Mixed,
        dataType:String,
        default:{}
    },
    dataObject1:{
        type:mongoose.Schema.Types.Mixed,
        dataType:String,
        default:{}
    },
    dataObject2:{
        type:mongoose.Schema.Types.Mixed,
        dataType:String,
        default:{}
    },
    dataObject3:{
        type:mongoose.Schema.Types.Mixed,
        dataType:String,
        default:{}
    },
    dataObjectHeader:{
        type:mongoose.Schema.Types.Mixed,
        dataType:String,
        default:{}
    },
    status:{
        type:String,
        enum:['received','initiated','sent','delivered','failed','deleted'],
        default:"received"
    },
    primaryHookId:{
        type:String,
        // unique:true,
        default:""
    }
},{timestamps:true})

webHooksLogsSchema.pre('save',function(next){
    this.webHookLogId = this._id
    next()
})
module.exports = mongoose.model('webhooklogs',webHooksLogsSchema)