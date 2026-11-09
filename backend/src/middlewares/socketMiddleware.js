import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/user.js";

export async function socketAuth(socket, next) {
    try {
        const token = socket.handshake.auth?.token;
        if (typeof token !== "string" || !token) throw new Error("Missing token");
        const claims = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        if (typeof claims !== "object" || !mongoose.isObjectIdOrHexString(claims.userId) || !claims.exp || !await User.exists({_id: claims.userId})) throw new Error("Invalid user");
        socket.data.userId = claims.userId.toString();
        socket.data.expiresAt = claims.exp * 1000;
        next();
    } catch (cause) {
        const error = new Error("Please sign in to connect");
        error.data = {code: cause.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "UNAUTHORIZED"};
        next(error);
    }
}
