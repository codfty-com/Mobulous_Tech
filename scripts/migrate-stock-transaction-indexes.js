import mongoose from "mongoose";
import { env } from "../src/config/env.js";
import { migrateStockHoldings } from "./migrate-stock-holdings.js";

try {
  if (!env.mongoUri) throw new Error("MONGO_URI is not defined");
  await mongoose.connect(env.mongoUri, {
    autoIndex: false,
    autoCreate: false,
    ...(env.mongoDbName ? { dbName: env.mongoDbName } : {}),
  });
  console.log(await migrateStockHoldings({ apply: process.argv.includes("--apply") }));
} catch (error) {
  console.error("Stock holding migration failed:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
