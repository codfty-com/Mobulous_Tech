import mongoose from "mongoose";

// The built-in unique _id index also works on databases whose old stock index
// is still non-unique. One transaction at a time can write a user's symbol.
const schema = new mongoose.Schema({
  _id: String,
  revision: { type: Number, default: 0 },
});

export default mongoose.model("StockWriteLock", schema);
