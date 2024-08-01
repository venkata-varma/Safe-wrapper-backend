const mongoose = require('mongoose')

const integrationsExceptionsSchema = new mongoose.Schema({
    integrationsExceptionId:{
        type : mongoose.Schema.Types.ObjectId,
        default : null
    },
    accountId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'accounts',
        index : true,
        default : null
    },
    integrationsMasterId :{
        type : mongoose.Schema.Types.ObjectId,
        ref : 'integrationsMaster',
        index : true,
        default : null
    },
    CPDWorkOrderId : {
        type : String,
        deafult : 0
    },
    CPDWorkOrderNumber:{
        type: String,
        default:""
    },
    runnigWorkOrderId: {
        type: String,
        default: ""
    },
    networkCode : {
        type : Number,
        default : 200
    },
    exceptionTitle : {
        type : String,
        default : ""
    },
    integrationsApiServices : {
        type : String,
        default : ""
    },
    exceptionMessage : {
        type : String,
        default : ""
    },
    exceptionRequestObject: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    dateCreated : {
        type : Date,
        default : new Date()
    }
},{timestamps:true});

integrationsExceptionsSchema.pre('save', function(next){
    this.integrationsExceptionId = this._id;
    next();
});

module.exports = mongoose.model('integrationsexceptions',integrationsExceptionsSchema);