import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import { ASSET_CATEGORIES } from "../src/config/assets.js";
import Asset from "../src/models/asset.js";

const valuationSourceFor = (key) => {
  if (key === "stocks") return "stocks";
  if (key === "mutual_funds") return "mutual_funds";
  return "none";
};

try {
  await connectDB();

  const operations = ASSET_CATEGORIES.map((asset, index) => ({
    updateOne: {
      filter: { key: asset.key },
      update: {
        $set: {
          ...asset,
          valuationSource: valuationSourceFor(asset.key),
          sortOrder: index,
          isActive: true,
        },
      },
      upsert: true,
    },
  }));

  const result = await Asset.bulkWrite(operations);
  console.log(
    `Asset seed complete: ${result.upsertedCount} inserted, ${result.modifiedCount} updated.`,
  );
} catch (error) {
  console.error("Asset seed failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
