const mongoose = require('mongoose')


const webHooksSchema = new mongoose.Schema({
    webHookId:{
        type:mongoose.Schema.Types.ObjectId,
        index:true,
        default:null
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "accounts",
        index : true,
        default: null,
    },
   
    name:{
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
    randomNumber:{
        type:Number,
        required:[true,"Designated random number is mandatory"]
    },
    requestObject:{
        type: mongoose.Schema.Types.Mixed,
        default:{}
    },
    primaryHookId:{
        type:String,
        default:""
    },
    comments:{
        type:String,
        default:null
    },
    status:{
        type:String,
        enum:['active','offline','delete'],
        default:"active"
    }
},{timestamps:true})

webHooksSchema.pre('save',function(next){
    this.webHookId = this._id,
    next()
})

module.exports = mongoose.model('webhooksmastermodel',webHooksSchema)