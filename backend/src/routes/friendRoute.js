import express from "express";
import { getFriends, getFriendRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, cancelFriendRequest, removeFriend } from "../controllers/friendController.js";
import { requireFriend, canSendFriendRequest, canRespondToFriendRequest, canCancelFriendRequest } from "../middlewares/friendMiddleware.js";

const router = express.Router();
// Authentication is applied before this router in server.js.
router.get("/", getFriends);
router.get("/requests", getFriendRequests);
router.post("/requests", canSendFriendRequest, sendFriendRequest);
router.patch("/requests/:requestId/accept", canRespondToFriendRequest, acceptFriendRequest);
router.patch("/requests/:requestId/reject", canRespondToFriendRequest, rejectFriendRequest);
router.patch("/requests/:requestId/cancel", canCancelFriendRequest, cancelFriendRequest);
router.delete("/:userId", requireFriend, removeFriend);

export default router;
