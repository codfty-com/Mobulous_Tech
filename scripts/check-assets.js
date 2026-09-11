import Asset from "../src/models/asset.js";
import UserStock from "../src/models/userStock.js";
import UserMutualFund from "../src/models/userMutualFund.js";
import { getNetWorth } from "../src/controllers/assets.controller.js";
import {
  createAssetSchema,
  getAssetsQuerySchema,
  updateAssetSchema,
} from "../src/validators/asset.validators.js";

const valid = createAssetSchema.body({
  key: "real_estate",
  name: "Real Estate",
  assetId: "09",
  status: "available",
  valuationSource: "none",
  examples: ["Home"],
});
if (!valid.success) throw new Error(JSON.stringify(valid));

const invalid = createAssetSchema.body({ key: "Bad Key", name: "" });
if (invalid.success) throw new Error("Invalid asset was accepted");

const update = updateAssetSchema.body({ displayOrder: 2, isActive: false });
if (!update.success) throw new Error(JSON.stringify(update));

const query = getAssetsQuerySchema.query({ status: "AVAILABLE", isActive: "false" });
if (!query.success || query.data.isActive !== false) throw new Error(JSON.stringify(query));

const document = new Asset(valid.data);
await document.validate();
const json = document.toJSON();
if (json.iconUrl !== json.icon || json.imageUrl !== json.icon) {
  throw new Error("Asset URL aliases are missing");
}
if (json.assetId !== "09") {
  throw new Error("Asset list fields are missing");
}

UserStock.aggregate = async () => [
  {
    totalInvestment: 1000,
    totalCurrentValue: 1250,
    totalStocks: 2,
    totalQuantity: 12,
    totalTransactions: 3,
    buyTransactions: 2,
    sellTransactions: 1,
  },
];
UserMutualFund.aggregate = async () => [
  { investedValue: 500, currentValue: 600, holdingsCount: 1 },
];

const req = {
  query: {},
  user: { userId: "000000000000000000000001", admin: false },
};
const res = {
  statusCode: 0,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
};

await getNetWorth(req, res);
if (
  res.statusCode !== 200 ||
  res.body.data.totalNetWorth !== 1850 ||
  res.body.data.totalProfitLoss !== 350 ||
  res.body.data.holdingsCount !== 3
) {
  throw new Error(JSON.stringify(res.body));
}

console.log("Asset schema, validation, and net-worth checks passed.");
