import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    conversation: {type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true},
    sender: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    // Unicode strings preserve kaomoji and emoji without a separate message type.
    content: {type: String, required: true, trim: true, maxlength: 4000},
}, {timestamps: true});

// _id breaks ties when multiple messages have the same creation time.
messageSchema.index({conversation: 1, createdAt: -1, _id: -1});

// Controllers must check membership before reading or sending messages, and
// update Conversation.lastMessage/lastMessageAt when a message is created.
export default mongoose.model("Message", messageSchema);
