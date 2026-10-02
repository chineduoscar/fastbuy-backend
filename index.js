import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoute from "./routes/auth.route.js";
import productRoute from "./routes/product.route.js";
import paymentRoute from "./routes/payment.route.js";
import swaggerUi from "swagger-ui-express";
// import webhookRoute from "./routes/payment.route.js";
import swaggerDocument from "./swagger-output.json" with { type: "json" };
import cors from "cors";
dotenv.config();

const app = express();

const PORT = process.env.PORT;
const MONGO_URI = process.env.MONGO_URI;

app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(
  cors({
    origin: ["http://localhost:5173", "https://fastestbuy.vercel.app"],
  }),
);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/auth", authRoute);
app.use("/product", productRoute);
app.use("/pay", paymentRoute);
// app.use("/pay/webhook", webhookRoute);

async function start() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("My Database is connected");
    app.listen(PORT, () => {
      console.log(`Server is listening on port ${PORT}`);
    });
  } catch (error) {
    console.log(error);
  }
}

start();
