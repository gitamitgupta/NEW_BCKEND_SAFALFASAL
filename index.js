import dotenv from "dotenv";
import connectDB from "./src/db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./.env",
});
 const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`⚙️ Server running on http://localhost:${PORT}`);

    });
  })
  .catch((err) => {
    console.log("MONGO db connection failed !!! ", err);
  });