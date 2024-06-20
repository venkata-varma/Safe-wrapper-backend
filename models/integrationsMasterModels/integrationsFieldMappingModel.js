const mongoose = require("mongoose");

const integrationsFieldMappingSchema = new mongoose.Schema(
  {
    fieldMappingId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "accounts",
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      default: null,
    },
    integrationsMasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "integrationsMaster",
      required: [true, "integrationId required"],
      default: null,
    },
    from: {
      type: String,
      enum: ["CPD", "SC", "SNOW", "TT", "QB", "MGP", "SI", "AM", "DF"],
      //   require: [true, "Role is required."],
      default: "",
    },
    to: {
      type: String,
      enum: ["CPD", "SC", "SNOW", "TT", "QB", "MGP", "SI", "AM", "DF"],
      //   require: [true, "Role is required."],
      default: "",
    },
    serviceMethod:{
      type : String,
      default : ""
    },
    serviceName:{
      type : String,
      default : ""
    },
    filedMappingType: {
      type: String,
      enum: ["default", "custom"],
      default: "default",
    },
    dataPoints: {
      type: Object,
      default: {},
    },
    requiredKeys : {
      type : Object,
      default : {}
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

integrationsFieldMappingSchema.pre("save", function (next) {
  this.fieldMappingId = this._id;
  next();
});

module.exports = mongoose.model(
  "integrationsFieldMapping",
  integrationsFieldMappingSchema
);
