import mongoose from "mongoose";

const friendRequestSchema = new mongoose.Schema({
    sender: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    recipient: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected", "cancelled"],
        default: "pending",
        required: true,
    },
    // Derived from both users; preserves direction in sender/recipient.
    pairKey: {type: String, required: true},
}, {timestamps: true});

friendRequestSchema.pre("validate", function () {
    if (!this.sender || !this.recipient) return;
    if (this.sender.equals(this.recipient)) {
        this.invalidate("recipient", "You cannot send yourself a friend request");
        return;
    }
    this.pairKey = [this.sender.toString(), this.recipient.toString()].sort().join(":");
});

// Resolved requests remain as history; only one pending request per pair.
friendRequestSchema.index({pairKey: 1}, {unique: true, partialFilterExpression: {status: "pending"}});
friendRequestSchema.index({recipient: 1, status: 1, createdAt: -1});
friendRequestSchema.index({sender: 1, status: 1, createdAt: -1});

export default mongoose.model("FriendRequest", friendRequestSchema);
