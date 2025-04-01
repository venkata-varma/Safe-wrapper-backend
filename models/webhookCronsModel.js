const mongoose = require('mongoose')

const webhookCronsSchema = mongoose.Schema({
    webhookCronId:{
        type : mongoose.Schema.Types.ObjectId,
        default : null
    },
    accountId:{
        type : mongoose.Schema.Types.ObjectId,
        ref : "accounts",
        index : true,
        default : null,
    },
    webhookMasterId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'webhookmasters',
        index : true,
        deafult : null
    },
    cronJobType : {
        type : String,
        enum : ["manual","automated"],
    },
    pulledCount : {
        type : Number,
        default : 0
    },
    status:{
        type : String,
        enum : ["initiated","completed","error","failed"],
        default : "initiated"
    }
},{timestamps : true});

webhookCronsSchema.pre("save", function (next) {
    this.webhookCronId = this._id;
    next(); 
});

module.exports = mongoose.model('webhookcrons',webhookCronsSchema)