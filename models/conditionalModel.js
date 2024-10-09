const mongoose = require('mongoose');


const conditionalOperationsSchema = mongoose.Schema({
    conditionId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "accounts",
        index : true,
        default: null,
    },
    integrationsMasterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "integrationsmasters",
        index : true,
        default: null,
    },
    serviceProvider:{
        type: String,
        default:""
    },
    status:{
        type: String,
        enum: ['active','inactive','deleted'],
        default: "active"
    },
    conditions: [{
        serviceType: {
            type: String,
            default:""
        },
        serviceCondition: {
            type:String,
            default:""
        },
        serviceLogicValues:{
            type: Array,
            default: []
        }
    }]
},{timestamps:true});

conditionalOperationsSchema.pre('save',function(next){
    this.conditionId = this._id;
    next();
});

module.exports = mongoose.model('conditionaloperations',conditionalOperationsSchema)