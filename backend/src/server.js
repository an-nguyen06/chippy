import express from "express";
import {createServer} from "node:http";
import {setupSocket} from "./libs/socket.js";
import dotenv from "dotenv";
import {connectDB} from "./libs/db.js";
import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";
import friendRoute from "./routes/friendRoute.js";
import conversationRoute from "./routes/conversationRoute.js";
import kaomojiRoute from "./routes/kaomojiRoute.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import { protectedRoute } from "./middlewares/authMiddleware.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
app.set("io", setupSocket(httpServer));
const PORT = process.env.PORT || 3000;

// middlewares
app.use(cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

// public routes
app.use('/api/auth', authRoute);

// private routes
app.use(protectedRoute);
app.use("/api/users", userRoute);
app.use("/api/kaomoji", kaomojiRoute);
app.use("/api/friends", friendRoute);
app.use("/api/conversations", conversationRoute);

connectDB().then ( () => {
    httpServer.listen(PORT, () => {
        console.log(`server starts at ${PORT}`);
    });
});
