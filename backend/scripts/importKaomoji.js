import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Kaomoji from "../src/models/kaomoji.js";
dotenv.config({path: fileURLToPath(new URL("../.env", import.meta.url)), quiet: true});
const source = "https://github.com/an-nguyen06/emoticon_kaomoji_dataset";
const strings = (values) => [...new Set((Array.isArray(values) ? values : []).filter((value) => typeof value === "string").map((value) => value.trim().toLowerCase()).filter(Boolean))];
try {
    const dataset = JSON.parse(await readFile(new URL("../data/emoticon_dict.json", import.meta.url), "utf8"));
    if (!dataset || typeof dataset !== "object" || Array.isArray(dataset)) throw new Error("Invalid dataset format");
    if (!process.env.MONGODB_CONNECTIONSTRING) throw new Error("MONGODB_CONNECTIONSTRING is missing");
    await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING, {serverSelectionTimeoutMS: 15000, connectTimeoutMS: 10000, socketTimeoutMS: 20000});
    await Kaomoji.init();
    let batch = [], imported = 0, skipped = 0;
    for (const [text, metadata] of Object.entries(dataset)) {
        if (!text.trim() || text.length > 4000 || !metadata || typeof metadata !== "object") {skipped++; continue;}
        const categories = strings(metadata.new_tags);
        const tags = strings([...categories, ...strings(metadata.original_tags)]);
        const _id = createHash("sha256").update(text).digest("hex");
        batch.push({updateOne: {filter: {_id}, update: {$set: {text, categories, tags, source}}, upsert: true}});
        if (batch.length === 500) {await Kaomoji.bulkWrite(batch); imported += batch.length; batch = []; if (imported % 5000 === 0) console.log(`Imported ${imported} expressions…`);}
    }
    if (batch.length) {await Kaomoji.bulkWrite(batch); imported += batch.length;}
    console.log(`Imported/updated ${imported} kaomoji; skipped ${skipped}. Rerunning does not duplicate entries.`);
} catch (error) {
    console.error("Kaomoji import failed:", error.name, error.code || "", error.name === "MongooseServerSelectionError" ? "Cannot reach MongoDB" : error.message);
    process.exitCode = 1;
} finally {await mongoose.disconnect();}
