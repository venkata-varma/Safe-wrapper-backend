const mongoose = require('mongoose')

const workOrderLifeCycleSchema = new mongoose.Schema({
    workOrderLifeCycleId : {
        type : mongoose.Schema.Types.ObjectId,
        default : null
    },
    workOrderId:{
        type : String,
        default : ""
    },
    WorkOrderNumber: {
        type: String,
        default:""
    },
    workOrderStatus : {
        type : String,
        default : ""
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
    serviceProvider : {
        type : String,
        default : ""
    },
    date_created : {
        type : Date,
        default : new Date()
    },
    notes : {
        type : String,
        default : ""
    }
},{timestamps:true});

workOrderLifeCycleSchema.pre("save", function (next) {
    this.workOrderLifeCycleId = this._id;
    next();
  });

module.exports = mongoose.model('workOrderLifeCycle',workOrderLifeCycleSchema);