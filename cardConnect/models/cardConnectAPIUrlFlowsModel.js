const mongoose = require("mongoose");

const cardConnectAPIUrlsFlowSchema = new mongoose.Schema(
    {
        cardConnectAPIUrlsFlowId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true,
            default: function () {
                return this._id;
            },
        },
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



    },
    { timestamps: true }
);



module.exports = mongoose.model(
    "cardconnectapiurlflows",
    cardConnectAPIUrlsFlowSchema
);
