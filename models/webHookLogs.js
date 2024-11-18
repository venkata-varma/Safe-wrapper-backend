const mongoose = require('mongoose')

const webHooksLogsSchema = new mongoose.Schema({
    webHookLogId: {
        type:mongoose.Schema.Types.ObjectId,
        default:null
    },
    webHookId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"webhooksmodel",
        default:null
    },
    requestObject:{
        type:mongoose.Schema.Types.Mixed,
        default:{}
    },
    status:{
        type:String,
        default:"active"
    }
},{timestamps:true})

webHooksLogsSchema.pre('save',function(next){
    this.webHookLogId = this._id
    next()
})
module.exports = mongoose.model('')