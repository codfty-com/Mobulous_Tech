import assert from "node:assert/strict";
import User from "../src/models/user.js";
import {
  getAllUsers,
  permanentlyDeleteUserById,
  softDeleteUserById,
} from "../src/controllers/adminUsers.controller.js";

const userId = "000000000000000000000001";
const response = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(body) { this.body = body; return this; },
});

User.find = () => ({
  select: () => ({ sort: async () => [{ _id: userId, isDeleted: false }] }),
});

const listResponse = response();
await getAllUsers({}, listResponse);
assert.equal(listResponse.statusCode, 200);
assert.equal(listResponse.body.data.length, 1);

let softDeleteUpdate;
User.findByIdAndUpdate = (_id, update) => {
  assert.equal(String(_id), userId);
  softDeleteUpdate = update;
  return { select: async () => ({ _id: userId, isDeleted: true }) };
};

const softDeleteResponse = response();
await softDeleteUserById({ params: { _id: userId } }, softDeleteResponse);
assert.equal(softDeleteResponse.statusCode, 200);
assert.equal(softDeleteResponse.body.data.isDeleted, true);
assert.equal(softDeleteUpdate.$set.isDeleted, true);
assert.ok(softDeleteUpdate.$set.deletedAt instanceof Date);

User.findByIdAndDelete = (_id) => {
  assert.equal(String(_id), userId);
  return { select: async () => ({ _id: userId }) };
};

const permanentDeleteResponse = response();
await permanentlyDeleteUserById({ params: { _id: userId } }, permanentDeleteResponse);
assert.equal(permanentDeleteResponse.statusCode, 200);
assert.equal(permanentDeleteResponse.body.message, "User permanently deleted successfully");

const invalidUserResponse = response();
await softDeleteUserById({ params: { _id: "invalid" } }, invalidUserResponse);
assert.equal(invalidUserResponse.statusCode, 400);

console.log("Admin user tracking, soft deletion, and permanent deletion checks passed.");
