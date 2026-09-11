import mongoose from "mongoose";

const assetSchema = new mongoose.Schema(
  {
    // Stable frontend identifier. MongoDB's _id remains the API resource ID.
    assetId: {
      type: String,
      trim: true,
      maxlength: [50, "Asset ID cannot exceed 50 characters"],
      unique: true,
      sparse: true,
    },
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: [50, "Asset key cannot exceed 50 characters"],
      match: [/^[a-z0-9_]+$/, "Asset key can only contain lowercase letters, numbers, and underscores"],
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Asset name cannot exceed 100 characters"],
    },
    icon: {
      type: String,
      trim: true,
      maxlength: [500, "Icon URL cannot exceed 500 characters"],
      default: "",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: ["available", "coming_soon", "disabled"],
      default: "coming_soon",
      lowercase: true,
      trim: true,
      index: true,
    },
    dataRoute: {
      type: String,
      trim: true,
      maxlength: [200, "Data route cannot exceed 200 characters"],
      default: null,
    },
    searchParam: {
      type: String,
      trim: true,
      maxlength: [50, "Search parameter cannot exceed 50 characters"],
      default: null,
    },
    examples: {
      type: [String],
      default: [],
      validate: {
        validator: (values) => values.length <= 20,
        message: "An asset cannot contain more than 20 examples",
      },
    },
    valuationSource: {
      type: String,
      enum: ["stocks", "mutual_funds", "none"],
      default: "none",
    },
    displayOrder: {
      type: Number,
      default: 0,
      min: [0, "Display order cannot be negative"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

assetSchema.index({ isActive: 1, status: 1, displayOrder: 1 });

assetSchema.set("toJSON", {
  transform: (document, value) => {
    value.iconUrl = value.icon;
    value.imageUrl = value.icon;
    return value;
  },
});

export default mongoose.model("Asset", assetSchema);
