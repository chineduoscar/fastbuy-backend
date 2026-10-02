import swaggerAutogen from "swagger-autogen";

const doc = {
  info: {
    title: "Fast Buy",
    description: "Website to buy food instantly",
  },
  host: "http://localhost:3000",
};

const outputFile = "./swagger-output.json";
const routes = ["./routes/auth.route.js", "./routes/product.route.js"];

swaggerAutogen()(outputFile, routes, doc);
