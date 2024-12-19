const { mongoose, schema } = require('mongoose')

const baseSourceRequestModelSchema = mongoose.Schema(
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
            ref : "integrationsMaster",
            index:true,
            default : null
        },
        refId:{
            type: Number, // ObjectId field without ref
            required: true,
        },
        refWorkOrderStatus:{
            type : String,
            default : null
        },
        responseObject: {
            type: String,
            default: null
        },
        customFields: {
            type: String,
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
       
        errorMessage: {
            type: String,
            default: null
        }
    }, { timestamps: true });

module.exports = mongoose.model('basesourcerequest', baseSourceRequestModelSchema)

