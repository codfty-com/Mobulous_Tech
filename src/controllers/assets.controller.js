import { ASSET_CATEGORIES } from "../config/assets.js";

export const getAssets = (req, res) => {
  const status = String(req.query.status || "").trim().toLowerCase();
  const assets = status
    ? ASSET_CATEGORIES.filter((asset) => asset.status === status)
    : ASSET_CATEGORIES;
  const data = assets.map((asset) => ({
    ...asset,
    iconUrl: asset.icon,
    imageUrl: asset.icon,
  }));

  return res.status(200).json({
    success: true,
    message: "Assets fetched successfully",
    ...(status ? { status } : {}),
    count: data.length,
    data,
  });
};
