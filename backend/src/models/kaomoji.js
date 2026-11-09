import mongoose from "mongoose";
const kaomojiSchema = new mongoose.Schema({
    _id: {type: String, required: true},
    text: {type: String, required: true, maxlength: 4000},
    categories: [String],
    tags: [String],
    source: {type: String, required: true},
}, {versionKey: false});
kaomojiSchema.index({categories: 1, _id: 1});
export default mongoose.model("Kaomoji", kaomojiSchema);
