import express from "express";
import {getKaomoji, getKaomojiCategories} from "../controllers/kaomojiController.js";
const router = express.Router();
router.get("/", getKaomoji);
router.get("/categories", getKaomojiCategories);
export default router;
