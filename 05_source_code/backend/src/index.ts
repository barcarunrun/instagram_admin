import cors from "cors";
import express from "express";
import { router } from "./routes/index.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

app.use("/api", router);

app.listen(port, () => {
  console.log(`backend listening on http://localhost:${port}`);
});