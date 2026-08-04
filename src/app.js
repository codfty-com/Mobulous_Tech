import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./config/db.js";
import { env, getCorsOptions } from "./config/env.js";
import userRoutes from "./routes/userRoutes.js";
import resetPassRoutes from "./routes/resetPassRoutes.js";
import marketDataRoutes from "./routes/marketDataRoutes.js";
import mutualFundDataRoutes from "./routes/mutualFundDataRoutes.js";
import assetsRoutes from "./routes/assetsRoutes.js";
import docsRoutes from "./routes/docsRoutes.js";

const app = express();
const apiRouter = express.Router();

const trimTrailingPathWhitespace = (url) => {
  const queryStart = url.indexOf("?");
  const pathname = queryStart === -1 ? url : url.slice(0, queryStart);
  const query = queryStart === -1 ? "" : url.slice(queryStart);

  return `${pathname.replace(/(?:%0A|%0D|%09|%20|\s)+$/gi, "")}${query}`;
};

app.use((req, res, next) => {
  req.url = trimTrailingPathWhitespace(req.url);
  next();
});

app.use(cors(getCorsOptions()));

app.use(express.json({ limit: env.requestBodyLimit, strict: false }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.body !== undefined) return next();

  const method = req.method;
  if (method !== "POST" && method !== "PUT" && method !== "PATCH") {
    return next();
  }

  let raw = "";
  req.setEncoding("utf8");
  req.on("data", (chunk) => {
    raw += chunk;
  });
  req.on("end", () => {
    if (raw) {
      try {
        req.body = JSON.parse(raw);
      } catch {
        req.body = {};
      }
    } else {
      req.body = {};
    }
    next();
  });
});

app.use(docsRoutes);
app.use("/api", docsRoutes);
app.use(assetsRoutes);
app.use("/api", assetsRoutes);

const dbPromise = connectDB();

app.use(async (req, res, next) => {
  try {
    await dbPromise;
    next();
  } catch (err) {
    next(err);
  }
});

apiRouter.use(userRoutes);
apiRouter.use(resetPassRoutes);
apiRouter.use(marketDataRoutes);
apiRouter.use(mutualFundDataRoutes);

app.use(apiRouter);
app.use("/api", apiRouter);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: `${env.appName} is running`,
    environment: env.nodeEnv,
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, req, res, next) => {
  console.error("Global Error:", err);

  res.status(500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

export default app;


