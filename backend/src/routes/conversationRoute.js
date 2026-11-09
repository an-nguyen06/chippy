import express from "express";
import {getConversations, getConversation, createConversation, updateConversation} from "../controllers/conversationController.js";
import messageRoute from "./messageRoute.js";

const router = express.Router();
// protectedRoute authenticates all requests before this router in server.js.
router.get("/", getConversations);
router.post("/", createConversation);
router.use("/:conversationId/messages", messageRoute);
router.get("/:conversationId", getConversation);
router.patch("/:conversationId", updateConversation);

export default router;
