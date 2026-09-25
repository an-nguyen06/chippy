import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING);
        console.log("connected to database"); 
    } catch (error) {
        console.log("error connecting database:", error);
        process.exit(1);
    }
}