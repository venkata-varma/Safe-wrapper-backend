const mongoose = require('mongoose')

const webHookMetaPayloads = new mongoose.Schema({
    webHookMetaPayloadId: {
        type:mongoose.Schema.Types.ObjectId,
        index:true,
        // default:null
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "accounts",
        index : true,
        // default: null,
    },
    
    webHookMasterId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"webhooksmastermodels",
        index:true,
        // default:null
    },
    dataPoint:{
        type:mongoose.Schema.Types.Mixed,
        dataType:String,
        default:{}
    },
    status:{
        type:String,
        enum:['received','in-progress','executed','execution-failed','deleted'],
        default:"received"
    },
    primaryHookId:{
        type:String,
        // unique:true,
        default:""
    }
},{timestamps:true})

webHookMetaPayloads.pre('save',function(next){
    this.webHookMetaPayloadId = this._id
    next()
})
module.exports = mongoose.model('webhookmetapayloads',webHookMetaPayloads)