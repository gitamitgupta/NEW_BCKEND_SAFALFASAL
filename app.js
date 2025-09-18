import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(express.json({ limit: "16kb" }));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// Corrected import paths
import userRouter from "./src/routes/user.routes.js";
import dataRouter from "./src/routes/data.routes.js"

// Corrected route mounting
app.use("/api/v1/users", userRouter);
app.use("/api/v1/data", dataRouter);


export { app };