const mongoose = require('mongoose');

const squarePOSCashDrawerShiftsSchema = new mongoose.Schema({
    squareCashDrawerShiftsId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        index: true,
        default: function () {
        return this._id;
            },
        },
    squarePOSIntegrationsCronIdCreate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "squareposintegrationscrons",
        default: null,
        index: true,

    },
    squarePOSIntegrationsCronIdUpdate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "squareposintegrationscrons",
        default: null,
        index: true,

    },
    accountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:"accounts",
        index: true,
        default: null,
    },
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"users",
        index: true,
        default: null
    },
    locationId: {
        type: String,
        required: true,
        index: true
    },
    referenceId: {
        type: String,
        required: true,
        default: "" 
    },
    referenceStatus: {
        type: String,
        enum: ['OPEN', 'ENDED', 'CLOSED'],
        index: true
    },
    openedAt: {
        type: Date
    },
    endedAt: {
        type: Date
    },
    closedAt: {
        type: Date
    },
    // The complete raw data from Square
    responseObject: {
        type: Object,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users'
    },
     updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        default: null,
    },
}, {
    timestamps: true
});


module.exports = mongoose.model('squarePOSCashDrawerShifts', squarePOSCashDrawerShiftsSchema);