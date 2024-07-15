const { mongoose, schema } = require('mongoose')

const SNOWWorkordersModelSchema = mongoose.Schema(
    {
        accountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "accounts",
            index : true,
            default: null,
        },
        integrationsCronId :{
            type : mongoose.Schema.Types.ObjectId,
            ref : 'integrationscrons',
            index : true,
            deafult : null
        },
        integrationsMasterId : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "integrationsMaster",
            index : true,
            default : null
        },
        SNOWWorkOrderId:{
            type:String,
            default:""
        },
        SNOWWorkOrders: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        SNOWWorkOrderStatus:{
            type : String,
            default : ""
        },
        status: {
            type : String,
            enum : ['initiated', 'update-request', 'pending', 'completed', 'error', 'failed'],
            default : "initiated"
        },
        priority:{
            type : String,
            enum : ['low','medium','high'],
            default:"medium"
        },
        errorMessage: {
            type: String,
            default: null
        }
    }, { timestamps: true });

module.exports = mongoose.model('snowworkorders', SNOWWorkordersModelSchema)

