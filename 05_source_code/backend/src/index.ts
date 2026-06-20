import cors from "cors";
import express from "express";
import { checkDatabaseConnection } from "./lib/db.js";
import { sendError } from "./lib/errors.js";
import { router } from "./routes/index.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? true,
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.use("/api", router);

app.use(
  (
    error: unknown,
    _request: express.Request,
    response: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error(error);
    return sendError(
      response,
      500,
      "INTERNAL_SERVER_ERROR",
      "予期しないエラーが発生しました。",
    );
  },
);

async function start(): Promise<void> {
  await checkDatabaseConnection();

  app.listen(port, () => {
    console.log(`backend listening on http://localhost:${port}`);
  });
}

void start().catch((error) => {
  console.error(error);
  process.exit(1);
});
