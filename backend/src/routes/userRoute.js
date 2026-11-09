import express from "express";
import { authMe } from "../controllers/userController.js";
import { updateProfile } from "../controllers/userController.js";

const router = express.Router();

router.get('/me', authMe);
router.patch('/me', updateProfile);

export default router;
