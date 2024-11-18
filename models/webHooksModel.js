const mongoose = require('mongoose')


const webHooksSchema = new mongoose.Schema({
    webHookId:{
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
    webHookName:{
        type:String,
        default:""
    },
    webHookUrl: {
        type:String,
        default:""
    },
    authenticationCode:{
        type:String,
        default:""
    },
    requestObject:{
        type: mongoose.Schema.Types.Mixed,
        default:{}
    },
    status:{
        type:String,
        enum:['active','delete'],
        default:"active"
    }
},{timestamps:true})

webHooksSchema.pre('save',function(next){
    this.webHookId = this._id,
    next()
})

module.exports = mongoose.model('webhooksmodel',webHooksSchema)