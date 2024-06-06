const mongoose = require('mongoose')

const integrationsCronsSchema = mongoose.Schema({
    integrationsCronId:{
        type : mongoose.Schema.Types.ObjectId,
        default : null
    },
    accountId:{
        type : mongoose.Schema.Types.ObjectId,
        ref : "accounts",
        index : true,
        default : null,
    },
    integrationsMasterId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'integrationsmasters',
        index : true,
        deafult : null
    },
    serviceProvider : {
        type : String,
        enum : ["CPD", "SC", "SNOW", "TT", "QB", "MGP", "SI", "AM", "DF"],
        default : null
    },
    cronJobType : {
        type : String,
        enum : ["manual","automated"],
    },
    pulledCount : {
        type : Number,
        dafault : 0
    },
    pushedCount : {
        type : Number,
        default : 0
    },
    status:{
        type : String,
        enum : ["initiated","completed","error","failed"],
        default : "initiated"
    }
},{timestamps : true});

integrationsCronsSchema.pre("save", function (next) {
    this.integrationsCronId = this._id;
    next();
});

module.exports = mongoose.model('integrationscrons',integrationsCronsSchema)