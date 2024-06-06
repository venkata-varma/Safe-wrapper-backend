const mongoose = require('mongoose')

const integrationsExceptionsSchema = mongoose.Schema({
    integrationsExceptionId:{
        type : mongoose.Schema.Types.ObjectId,
        default : null
    },
    accounId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'accounts',
        default : null
    },
    integrationsMasterId :{
        type : mongoose.Schema.Types.ObjectId,
        ref : 'integrationsmastes',
        default : null
    },
    networkCode : {
        type : Number,
        default : 200
    },
    exceptionTitle : {
        type : String,
        default : ""
    },
    exceptionMessage : {
        type : String,
        default : ""
    },
    dateCreated : {
        type : Date,
        default : new Date()
    }
},{timestamps:true});

integrationsExceptionsSchema.pre('save', (next)=>{
    this.integrationsExceptionId = this._id;
    next();
});

module.exports = mongoose.model('integrationsexceptions',integrationsExceptionsSchema);