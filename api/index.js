import app from "../src/app.js";
import serverless from "serverless-http";

// Wrap express app for Vercel serverless
export default serverless(app);
