import { foodItems } from "../data/products.js";
import Payment from "../models/payment.model.js";
import axios from "axios";
import { StatusCodes } from "http-status-codes";
import crypto from "crypto";

const initializePayment = async (req, res) => {
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  try {
    const { productId } = req.body;
    const FRONTEND_URL = process.env.FRONTEND_URL;

    const product = foodItems.find((product) => {
      return product.id === Number(productId);
    });

    console.log(product, req.user.email);

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",

      {
        email: req.user.email,
        amount: product.price * 100,
        callback_url: `${FRONTEND_URL}/verify/payment`,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    await Payment.create({
      user: req.user.id,
      productId: product.id,
      productName: product.name,
      amount: product.price,
      reference: response.data.data.reference,
      status: "pending",
    });

    res.status(StatusCodes.CREATED).json({
      message: response.data.message,
      data: {
        authorization_url: response.data.data.authorization_url,
        reference: response.data.data.reference,
      },
      status: true,
    });

    console.log(response);
  } catch (error) {
    console.log(error.response);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Oops! Something went wrong",
      status: false,
    });
  }
};

const verifyPayment = async (req, res) => {
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
  try {
    console.log(req.params);
    const { reference } = req.params;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
      },
    );

    if (response.data.data.status === "success") {
      await Payment.findOneAndUpdate(
        { reference },
        { status: "success" },

        {
          new: true,
          runValidators: true,
        },
      );

      res.status(StatusCodes.OK).json({
        message: response.data.message,
        status: true,
        data: {
          reference: response.data.data.reference,
          status: response.data.data.status,
        },
      });
    } else {
      await Payment.findOneAndUpdate(
        { reference },
        { status: "failed" },

        {
          new: true,
          runValidators: true,
        },
      );

      res.status(StatusCodes.BAD_REQUEST).json({
        message: response.data.message,
        status: false,
        data: {
          reference: response.data.data.reference,
          status: response.data.data.status,
        },
      });
    }
  } catch (error) {
    console.log(error.response);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Oops! Something went wrong",
      status: false,
    });
  }
};

const paymentWebhook = async (req, res) => {
  try {
    const hash = crypto
      .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
      .update(req.rawBody)
      .digest("hex");
    if (hash == req.headers["x-paystack-signature"]) {
      console.log(req.body);
      const { event, body } = req.body;

      if (event === "charge.success") {
        await Payment.findOneAndUpdate(
          { reference },
          { status: "success" },

          {
            new: true,
            runValidators: true,
          },
        );

        res.status(StatusCodes.OK).json({
          message: "Webhook verified",
          status: true,
          data: {
            reference: body.reference,
            status: "success",
          },
        });
      }
    }
  } catch {
    console.log(error.response);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Oops! Something went wrong",
      status: false,
    });
  }
};

export { initializePayment, verifyPayment, paymentWebhook };
