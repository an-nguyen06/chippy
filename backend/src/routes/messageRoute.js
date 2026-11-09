import express from "express";
import {getMessages, sendMessage, editMessage, deleteMessage} from "../controllers/messageController.js";

const router = express.Router({mergeParams: true});
// server.js authenticates requests before mounting this router.
router.get("/", getMessages);
router.post("/", sendMessage);
router.patch("/:messageId", editMessage);
router.delete("/:messageId", deleteMessage);

export default router;
