const mongoose = require("mongoose");

const integrationsMasterSchema = new mongoose.Schema(
  {
    integrationsMasterId: {
      type: mongoose.Schema.Types.ObjectId,
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
    title: {
      type: String,
      required: [true, "Title is required."],
      default: ""
    },
    description: {
      type: String,
      required: [true, "Description is required."],
      default: "",
    },
    from: {
      type: String,
      enum: ["CPD", "SC", "SNOW", "TT", "QB", "MGP", "SI", "AM", "DF","CYS", null],
      //   require: [true, "Role is required."],
      default: null,
    },
    to: {
      type: String,
      enum: ["CPD", "SC", "SNOW", "TT", "QB", "MGP", "SI", "AM", "DF", "CYS", null],
    //   require: [true, "Role is required."],
        default: null,
    },
    status: {
      type: String,
      enum: ["new","active", "deleted", "blocked", "offline"],
      default: "new",
    },
    stepCount: {
      type: Number,
      default: 1,
    },
    lastPullDate: {
      type: Date,
      default: "",
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

integrationsMasterSchema.pre("save", function (next) {
  this.integrationsMasterId = this._id;
  next();
});

module.exports = mongoose.model("integrationsMaster", integrationsMasterSchema);
