import axios from "axios";
import { StatusCodes } from "http-status-codes";

import Payment from "../models/payment.js";
import { foodItems } from "../data/product.js";
import crypto from "crypto";

const initializePayment = async (req, res) => {
  try {
    const { productId } = req.body;

    const product = foodItems.find((item) => item.id === Number(productId));

    if (!product) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: false,
        message: "Product not found",
      });
    }

    const amount = product.price * 100;

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: req.user.email,
        amount,
        callback_url: "http://localhost:3000/payment/verify",
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const payment = await Payment.create({
      user: req.user._id,
      productId: product.id,
      productName: product.name,
      amount: product.price,
      reference: response.data.data.reference,
      status: "pending",
    });

    return res.status(StatusCodes.OK).json({
      status: true,
      message: "Payment initialized",
      data: {
        paymentId: payment._id,
        reference: response.data.data.reference,
        authorizationUrl: response.data.data.authorization_url,
      },
    });
  } catch (error) {
    console.log(error.response?.data || error);

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Unable to initialize payment",
    });
  }
};

const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    const payment = await Payment.findOne({ reference });

    if (!payment) {
      return res.status(StatusCodes.NOT_FOUND).json({
        status: false,
        message: "Payment not found",
      });
    }

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    const transaction = response.data.data;

    if (transaction.status === "success") {
      await Payment.findOneAndUpdate(
        { reference },
        { status: "success" },
        { new: true },
      );

      return res.status(StatusCodes.OK).json({
        status: true,
        message: "Payment verified successfully",
        data: {
          reference: transaction.reference,
          amount: transaction.amount / 100,
          status: transaction.status,
          product: payment.productName,
        },
      });
    }

    await Payment.findOneAndUpdate(
      { reference },
      { status: "failed" },
      { new: true },
    );

    return res.status(StatusCodes.BAD_REQUEST).json({
      status: false,
      message: "Payment was not successful",
      data: {
        reference: transaction.reference,
        status: transaction.status,
      },
    });
  } catch (error) {
    console.log(error.response?.data || error);

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Unable to verify payment",
    });
  }
};

const paystackWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"];

    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(req.rawBody)
      .digest("hex");

    if (hash !== signature) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        status: false,
        message: "Invalid signature",
      });
    }

    const { event, data } = req.body;

    if (event === "charge.success") {
      const payment = await Payment.findOneAndUpdate(
        { reference: data.reference },
        {
          status: "success",
        },
        { new: true },
      );

      if (!payment) {
        console.log("Payment not found:", data.reference);
      } else {
        console.log("Payment marked as successful:", payment._id);
      }
    }

    return res.sendStatus(StatusCodes.OK);
  } catch (error) {
    console.log(error);

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Webhook error",
    });
  }
};

export { initializePayment, verifyPayment, paystackWebhook };
