import { StatusCodes } from "http-status-codes";
import User from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const register = async (req, res) => {
  try {
    const body = req.body;
    const { fullName, email, password } = body;

    if (!fullName && !email && !password) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: "Fill all required fields.",
        status: false,
      });

      return;
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(StatusCodes.BAD_REQUEST).json({
        message: "Email already in use",
        status: false,
      });

      return;
    }

    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
    });

    const token = generateToken(user);
    res.status(StatusCodes.CREATED).json({
      message: "Account created!",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
      token,
      status: true,
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Oops! Something went wrong",
      status: false,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Invalid Credentials",
        status: false,
      });

      return;
    }

    const isMatched = await bcrypt.compare(password, user.password);

    if (!isMatched) {
      res.status(StatusCodes.UNAUTHORIZED).json({
        message: "Invalid Credentials",
        status: false,
      });

      return;
    }

    const token = generateToken(user);

    res.status(StatusCodes.OK).json({
      message: "Login successful!",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
      token,
      status: true,
    });
  } catch (error) {
    console.log(error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: "Oops! Something went wrong",
      status: false,
    });
  }
};

const generateToken = (user) => {
  const token = jwt.sign(
    {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
    process.env.JWTSECRET,
    { expiresIn: "7d" },
  );
  return token;
};

export { register, login };
