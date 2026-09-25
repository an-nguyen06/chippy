import mongoose from "mongoose"

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true, //mongodb creates unique index -> faster
        trim: true,
        lowercase: true
    },
    hashedPassword: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    displayName: {
        type: String,
        required: true,
        trim: true
    },
    avatarUrl: {
        type: String, // cnd link showing image
    },
    avatarId: {
        type: String, // cloudinary public_id to delete image
    },
    bio: {
        type: String,
        maxlength: 500,
    },
    phone: {
        type: String,
        sparse: true, //can be null, but not duplicate
    },
},
{
    timestamps: true,
}

);

const User = mongoose.model("User", userSchema);
export default User;
