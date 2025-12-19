const mongoose = require("mongoose");

const APIUrlFlowSchema = new mongoose.Schema({
    APIUrlFlowName: {
        type: String,
        required: [true, "API Url flow name is mandatory"],
        default: ""
    },
    order: {
        type: Number,
        default: 1,
        required: [true, "Order is mandatory"]
    },
    url: {
        type: String,
        default: "",
        required: [true, "URL is mandatory"]
    },
    serviceMethod: {
        type: String,
        default: "GET",
        required: [true, "Service method is mandatory"]
    },
    dataMappingPath: {
        type: Array,
        required: [true, "dataMapping path key is mandatory"],
        default: []
    },
    primaryKeyValues: {
        type: Array,
        default: []
    },
    dataPoints: {
        type: Array,
        default: []
    },
    paginationRequired: {
        type: Boolean,
        default: false,

    },
    rateLimit: {
        status: {
            type: Boolean,
            default: false
        },
        limit: {
            type: Number,
            default: 0
        }
    },
    filteredReferenceId: {
        type: String,
        default: ""
    },
    statusKey: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["active", "deleted"],
        default: "active",
    },


})




const squarePOSIntegrationsAPIUrlFlowSchema = new mongoose.Schema(
    {
        squarePOSIntegrationsAPIUrlFlowId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true,
            default: function () {
                return this._id;
            },
        },
        
        accountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "accounts",
            index: true,
            default: null,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            index: true,
            default: null,
        },
        APIUrlFlows: [APIUrlFlowSchema],

        status: {
            type: String,
            enum: ["active", "offline"],
            default: "active"
        },

        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            required: [true, "Created by is required."],
            default: null,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "users",
            default: null,
        },

    },
    { timestamps: true }
);



module.exports = mongoose.model(
    "squarePOSintegrationsapiurlflows",
    squarePOSIntegrationsAPIUrlFlowSchema
);
