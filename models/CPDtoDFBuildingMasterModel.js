const mongoose = require('mongoose')

const CPDtoDFBuildingMasterSchema = mongoose.Schema({
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
    CPDtoDFBuildingId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    DFBuildingId: {
        type: Number,
        default: 0,
    },
    DFSalesPersonId: {
        type: Number,
        default: 0
    },
    DFInvoiceRootId: {
        type: Number,
        default: 0
    },
    DFBuildingName: {
        type: String,
        default: ""
    },
    DFBuildingObject: {
        type: Object,
        default: {}
    },
    CPDBuildingName: {
        type: String,
        default: ""
    },
    CPDOccupantId: {
        type: Number,
        default: ""
    },
    CPDOccupantSpaceId: {
        type: Number,
        default: 0
    },
    CPDBuildingObject: {
        type: Object,
        default: {}
    }
},{timestamps: true});

CPDtoDFBuildingMasterSchema.pre('save', function(next){
    this.CPDtoDFBuildingId = this._id;
    next()
});

module.exports = mongoose.model('CPDtoDFBuildingMaster',CPDtoDFBuildingMasterSchema)