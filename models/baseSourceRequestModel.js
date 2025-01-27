const { mongoose, schema } = require('mongoose')

const baseSourceRequestModelSchema = new mongoose.Schema(
    {
        accountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "accounts",
            index: true,
            default: null,
        },
        integrationsCronId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'integrationscrons',
            index: true,
            deafult: null
        },
        integrationsMasterId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "integrationsMaster",
            index: true,
            default: null
        },
        referenceId: {
            type: String,
            required: true,
        },
        referenceStatus: {
            type: String,
            required: true,
            default: null
        },
        responseObject: {
            type: String,
            default: null
        },
        sourceReferenceId: {
            type: String,
            default: null
            // required: true,
        },
        destinationReferenceId: {
            type: String,
            default: null
            // required: true,
        },
        // customFields: {
        //     type: String,
        //     default: null
        // },
        status: {
            type: String,
            enum: ['initiated', 'pending', 'completed', 'error', 'failed'],
            default: "initiated"
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high'],
            default: "medium"
        },
    }, { timestamps: true });

baseSourceRequestModelSchema.index({ integrationsMasterId:1, referenceId:1, referenceStatus:1 }, { unique: true })
const baseSourceRequestModel = mongoose.model('basesourcerequest', baseSourceRequestModelSchema)


module.exports = {
    baseSourceRequestModelSchema,
    baseSourceRequestModel

}