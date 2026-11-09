import mongoose from "mongoose";

// One undirected friendship per pair. Sorting makes A/B and B/A identical.
const friendSchema = new mongoose.Schema({
    user1: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    user2: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
}, {timestamps: true});

friendSchema.pre("validate", function () {
    if (!this.user1 || !this.user2) return;
    if (this.user1.equals(this.user2)) {
        this.invalidate("user2", "You cannot be friends with yourself");
        return;
    }
    if (this.user1.toString() > this.user2.toString()) {
        [this.user1, this.user2] = [this.user2, this.user1];
    }
});

friendSchema.index({user1: 1, user2: 1}, {unique: true});
friendSchema.index({user2: 1});

export default mongoose.model("Friend", friendSchema);
