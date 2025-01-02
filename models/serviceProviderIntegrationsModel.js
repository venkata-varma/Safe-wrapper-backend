const mongoose = require('mongoose')

const serviceProviderIntegrations = new mongoose.Schema({
    serviceProviderIntegrationId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true,
        default: null
    },
    fromServiceProviderListId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'serviceProviderList',
        index: true,
        default: null
    },
    toServiceProviderListId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'serviceProviderList',
        index: true,
        default: null
    },
    name: {
        type: String,
        default: ""
    },
    from: {
        type: String,
        default: ""
    },
    to: {
        type: String,
        default: ""
    },
    services: {
        type: Array,
        default: []
    },
    filterServices: {
        type: Array,
        default: []
    },
    mapping: {
        type: Object,
        default: {}
    },
    settings: {
        sourceSettings: {
            type: Object,
            default: {}
        },
        destinationSettings: {
            type: Object,
            default: {}
        },
        mappingSettings: {
            type: Object,
            default: {}
        },
        statusSettings: {
            type: Object,
            default: {}
        }
    },
    metrics:{
        sourceDataBaseName:{
            type:String
        },
        destinationDataBaseName:{
            type:String
        },
    },
    status: {
        type: String,
        default: "active"
    }
}, { timestamps: true });

serviceProviderIntegrations.pre('save', function (next) {
    this.serviceProviderIntegrationId = this._id
    next()
})

module.exports = mongoose.model('serviceproviderintegrations', serviceProviderIntegrations);