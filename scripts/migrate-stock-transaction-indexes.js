import mongoose from "mongoose";
import connectDB from "../src/config/db.js";
import UserStock from "../src/models/userStock.js";

const LEGACY_INDEX_NAME = "userId_1_symbol_1";
const EXPECTED_KEY = JSON.stringify({ userId: 1, symbol: 1 });

try {
  await connectDB();

  const indexes = await UserStock.collection.indexes();
  const legacyIndex = indexes.find((index) => index.name === LEGACY_INDEX_NAME);

  if (
    legacyIndex?.unique === true &&
    JSON.stringify(legacyIndex.key) === EXPECTED_KEY
  ) {
    await UserStock.collection.dropIndex(LEGACY_INDEX_NAME);
    console.log(`Dropped legacy unique index: ${LEGACY_INDEX_NAME}`);
  } else if (legacyIndex?.unique) {
    throw new Error(
      `Refusing to replace ${LEGACY_INDEX_NAME} because its key does not match the expected index`,
    );
  }

  await UserStock.collection.createIndex(
    { userId: 1, symbol: 1 },
    { name: LEGACY_INDEX_NAME, unique: false },
  );

  const migratedIndex = (await UserStock.collection.indexes()).find(
    (index) => index.name === LEGACY_INDEX_NAME,
  );

  if (!migratedIndex || migratedIndex.unique === true) {
    throw new Error("Stock transaction index migration did not complete correctly");
  }

  console.log(`Verified non-unique index: ${LEGACY_INDEX_NAME}`);
} catch (error) {
  console.error("Stock transaction index migration failed:", error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
