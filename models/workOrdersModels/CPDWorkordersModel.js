const { mongoose, schema } = require('mongoose')

const CPDWorkordersModelSchema = mongoose.Schema(
    {
        accountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "accounts",
            index:true,
            default: null,
        },
        integrationsCronId :{
            type : mongoose.Schema.Types.ObjectId,
            ref : 'integrationscrons',
            index:true,
            deafult : null
        },
        integrationsMasterId : {
            type : mongoose.Schema.Types.ObjectId,
            index:true,
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
            enum : ['low','medium','high'],
            default:"medium"
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

