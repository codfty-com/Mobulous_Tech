import { getIndices } from "../services/indices.service.js";

const parseForceRefresh = (value) =>
  value === true || value === "true" || value === "1" || value === 1;

export const getAllIndices = async (req, res) => {
  try {
    const result = await getIndices({
      forceRefresh: parseForceRefresh(req.query.forceRefresh),
    });

    return res.status(200).json({
      success: true,
      message: "Indices fetched successfully",
      source: result.source,
      count: result.data.length,
      ...(result.warning ? { warning: result.warning } : {}),
      data: result.data,
    });
  } catch (error) {
    console.error("Indices Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
      ...(error.details ? { details: error.details } : {}),
    });
  }
};
