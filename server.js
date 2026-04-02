import "dotenv/config";
import app from "./src/app.js";

const PORT = process.env.PORT || 3000;

// This file is for local development.
// Vercel will ignore this and use api/index.js instead.
app.listen(PORT, () => {
  console.log(`> Local server ready on http://localhost:${PORT}`);
});
