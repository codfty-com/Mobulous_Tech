import UserStock from "../src/models/userStock.js";
import { addStock, setAlerts } from "../src/controllers/stock.controller.js";
import { addStockSchema, updateStockSchema } from "../src/validators/stock.validators.js";

const userId = "000000000000000000000001";
const makeResponse = () => ({
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
});

const buy = addStockSchema.body({
  symbol: "RELIANCE.NS",
  name: "Reliance Industries",
  quantity: 10,
  price: 2500,
  transactionType: "buy",
});
const sell = addStockSchema.body({
  symbol: "RELIANCE.NS",
  name: "Reliance Industries",
  quantity: 4,
  price: 2700,
  transactionType: "SELL",
});

if (!buy.success || !sell.success || sell.data.transactionType !== "sell") {
  throw new Error("Valid buy/sell payload was rejected");
}
if (addStockSchema.body({ symbol: "ABC", name: "ABC Ltd", quantity: 0, price: 10 }).success) {
  throw new Error("Zero quantity was accepted");
}
if (addStockSchema.body({ symbol: "ABC", name: "ABC Ltd", quantity: 1 }).success) {
  throw new Error("A transaction without price was accepted");
}
if (updateStockSchema.body({}).success) {
  throw new Error("An empty stock update was accepted");
}

const sellDocument = new UserStock({ userId, ...sell.data });
await sellDocument.validate();
const sellJson = sellDocument.toJSON();
if (
  sellJson.transactionType !== "sell" ||
  sellJson.signedQuantity !== -4 ||
  sellJson.price !== 2700 ||
  sellJson.transactionValue !== 10800
) {
  throw new Error("Sell transaction output fields are incorrect");
}

UserStock.getNetQuantity = async () => 3;
const rejectedResponse = makeResponse();
await addStock(
  { user: { userId }, validated: { body: sell.data } },
  rejectedResponse,
);
if (rejectedResponse.statusCode !== 409) {
  throw new Error("Overselling was not rejected");
}

UserStock.getNetQuantity = async () => 10;
const originalSave = UserStock.prototype.save;
UserStock.prototype.save = async function () { return this; };
const acceptedResponse = makeResponse();
await addStock(
  { user: { userId }, validated: { body: sell.data } },
  acceptedResponse,
);
UserStock.prototype.save = originalSave;

if (
  acceptedResponse.statusCode !== 201 ||
  acceptedResponse.body.data.transactionType !== "sell" ||
  !acceptedResponse.body.transactionOptions.includes("buy") ||
  !acceptedResponse.body.transactionOptions.includes("sell")
) {
  throw new Error("Valid sell response is incorrect");
}

const originalFindOneAndUpdate = UserStock.findOneAndUpdate;
let capturedAlertUpdate;
UserStock.findOneAndUpdate = async (filter, update) => {
  capturedAlertUpdate = update.$set;
  return {
    _id: "000000000000000000000002",
    symbol: "RELIANCE.NS",
    alerts: { enabled: true, targetPrice: 3000 },
  };
};
const alertResponse = makeResponse();
await setAlerts(
  {
    user: { userId },
    params: { id: "000000000000000000000002" },
    validated: { body: { targetPrice: 3000 } },
  },
  alertResponse,
);
UserStock.findOneAndUpdate = originalFindOneAndUpdate;

if (
  alertResponse.statusCode !== 200 ||
  capturedAlertUpdate["alerts.targetPrice"] !== 3000 ||
  "alerts.enabled" in capturedAlertUpdate
) {
  throw new Error("Partial alert update incorrectly changed the enabled state");
}

console.log("Stock buy/sell validation, output, and oversell checks passed.");
