import express from "express";
import dotenv from "dotenv";
import {connectDB} from "./libs/db.js";
import authRoute from "./routes/authroute.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// middlewares
app.use(express.json());

// public routes
app.use('/api/auth', authRoute);

// private routes


connectDB().then ( () => {
    app.listen(PORT, () => {
        console.log(`server starts at ${PORT}`);
    });
});
