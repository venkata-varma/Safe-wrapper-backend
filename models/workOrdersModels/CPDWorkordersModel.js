const { mongoose, schema } = require('mongoose')

const CPDWorkordersModelSchema = mongoose.Schema(
    {
        accountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "accounts",
            default: null,
        },
        integrationsCronId :{
            type : mongoose.Schema.Types.ObjectId,
            ref : 'integrationscrons',
            deafult : null
        },
        integrationsMasterId : {
            type : mongoose.Schema.Types.ObjectId,
            default : null
        },
        CPDWorkOrderId:{
            type : Number,
            default : 0
        },
        CPDBranchId :{
            type : Number,
            default : 0
        },
        CPDWorkOrderStatus:{
            type : String,
            default : null
        },
        CPDWorkOrders: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },
        status: {
            type : String,
            enum : ['initiated', 'pending', 'completed', 'error', 'failed'],
            default : "initiated"
        },
        priority:{
            type : String,
            enum : ['low','meduim','high'],
            default:"meduim"
        },
        MessageId: {
            type: String,
            default: ""
        },
        errorMessage: {
            type: String,
            default: null
        }
    }, { timestamps: true });

module.exports = mongoose.model('cpdworkorders', CPDWorkordersModelSchema)

