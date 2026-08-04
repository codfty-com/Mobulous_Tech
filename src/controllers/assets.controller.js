import { ASSET_CATEGORIES } from "../config/assets.js";

export const getAssets = (req, res) => {
  const status = String(req.query.status || "").trim().toLowerCase();
  const data = status
    ? ASSET_CATEGORIES.filter((asset) => asset.status === status)
    : ASSET_CATEGORIES;

  return res.status(200).json({
    success: true,
    message: "Assets fetched successfully",
    ...(status ? { status } : {}),
    count: data.length,
    data,
  });
};
