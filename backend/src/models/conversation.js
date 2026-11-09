import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
    type: {type: String, enum: ["direct", "group"], default: "direct", required: true},
    participants: {
        type: [{type: mongoose.Schema.Types.ObjectId, ref: "User", required: true}],
        required: true,
        validate: {
            validator: (users) => users.length >= 2 && new Set(users.map(String)).size === users.length,
            message: "A conversation needs at least two distinct participants, with no duplicates",
        },
    },
    name: {type: String, trim: true, maxlength: 100, required: function () { return this.type === "group"; }},
    createdBy: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
    // Present only for direct chats, preventing duplicate threads for a pair.
    directKey: {type: String},
    lastMessage: {type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null},
    lastMessageAt: {type: Date, default: null},
}, {timestamps: true});

conversationSchema.pre("validate", function () {
    const users = this.participants || [];
    if (this.createdBy && !users.some((id) => id.equals(this.createdBy))) {
        this.invalidate("createdBy", "The creator must be a participant");
    }
    if (this.type === "direct") {
        if (users.length !== 2) this.invalidate("participants", "A direct conversation needs exactly two participants");
        this.directKey = users.map(String).sort().join(":");
    } else {
        this.directKey = undefined;
    }
});

conversationSchema.index({directKey: 1}, {unique: true, partialFilterExpression: {type: "direct"}});
conversationSchema.index({participants: 1, lastMessageAt: -1});

export default mongoose.model("Conversation", conversationSchema);
