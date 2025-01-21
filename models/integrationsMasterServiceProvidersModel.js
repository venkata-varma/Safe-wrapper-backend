const mongoose = require("mongoose");

const integrationsMasterServiceProvidersSchema = new mongoose.Schema(
  {
    integrationServiceProviderId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    integrationsMasterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "integrationsMaster",
      index : true,
      default: null,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "accounts",
      index : true,
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "users",
      index : true,
      default: null,
    },
    credentials: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    serviceProvider: {
      type: String,
      // enum: ["CPD", "SC", "SNOW", "TT", "QB", "MGP", "SI", "AM", "DF","CYS"],
      //   require: [true, "Role is required."],
      // default: "",
    },
    status: {
      type: String,
      enum: ["new", "verified","active", "failed", "deleted"],
      default: "new",
    },
    authType: {
      type: String,
      enum: ["BasicAuth", "BearerToken", "OAuth1.0", "OAuth2.0", "APIKEY"],
      default: "BasicAuth",
    },
    dataMappingPath:{
      type:Array,
      default:[]
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

integrationsMasterServiceProvidersSchema.pre("save", function (next) {
  this.integrationServiceProviderId = this._id;
  next();
});

module.exports = mongoose.model(
  "integrationsMasterServiceProviders",
  integrationsMasterServiceProvidersSchema
);
