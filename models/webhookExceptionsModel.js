const mongoose = require("mongoose");

const webhookExceptionsSchema = new mongoose.Schema(
  {
    webhookExceptionId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "accounts",
      index: true,
      default: null,
    },
    
   
    sourceWONumber: {
      type: String,
      default: "",
    },
    sourceWOId: {
      type: String,
      default: "",
    },
    destinationWONumber: {
      type: String,
      default: "",
    },
    runnigWorkOrderId: {
      type: String,
      default: "",
    },
    networkCode: {
      type: Number,
      default: 200,
    },
    exceptionTitle: {
      type: String,
      default: "",
    },
    integrationsApiServices: {
      type: String,
      default: "",
    },
    exceptionMessage: {
      type: mongoose.Schema.Types.Mixed,
      default: "",
    },
    exceptionRequestObject: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    dateCreated: {
      type: Date,
      default: new Date(),
    },
  },
  { timestamps: true }
);

webhookExceptionsSchema.pre("save", function (next) {
  this.webhookExceptionId = this._id;
  next();
});

module.exports = mongoose.model(
  "webhookexceptions",
  webhookExceptionsSchema
);