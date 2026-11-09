import User from "../models/user.js";

export const authMe = async (req, res) => {
  try {
    const user = req.user; // from authMiddleware

    return res.status(200).json({
      user,
    });
  } catch (error) {
    console.error("error calling authMe", error);
    return res.status(500).json({ message: "system error" });
  }
};
// Only explicitly supported profile fields can be changed by this endpoint.
export const updateProfile = async (req, res, next) => {
  try {
    if (!req.user?._id) return res.status(401).json({message: "Please sign in first"});
    const input = req.body;
    if (!input || typeof input !== "object" || Array.isArray(input)) return res.status(400).json({message: "Invalid profile data"});
    const updates = {};
    const invalid = (message) => res.status(400).json({message});
    const allowed = ["displayName", "bio", "phone", "avatarUrl", "preferences", "privacy"];
    if (Object.keys(input).some((key) => !allowed.includes(key))) return invalid("Unsupported profile field");
    for (const [key, max] of [["displayName", 100], ["bio", 500], ["phone", 30]]) {
      if (input[key] === undefined) continue;
      if (typeof input[key] !== "string" || input[key].trim().length > max || (key === "displayName" && !input[key].trim())) return invalid(`Invalid ${key}`);
      updates[key] = input[key].trim();
    }
    if (input.avatarUrl !== undefined) {
      if (typeof input.avatarUrl !== "string") return invalid("Invalid avatar");
      if (input.avatarUrl) {
        const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.avatarUrl);
        if (!match || match[2].length > 65536) return invalid("Choose a PNG, JPEG, or WebP avatar under 48 KB");
        const bytes = Buffer.from(match[2], "base64");
        const valid = match[1] === "png" ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : match[1] === "jpeg" ? bytes.subarray(0, 3).equals(Buffer.from([255,216,255])) : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
        if (!valid || bytes.length > 49152) return invalid("Invalid avatar image");
      }
      updates.avatarUrl = input.avatarUrl;
    }
    for (const [section, keys] of [["preferences", ["compactMode", "reduceMotion"]], ["privacy", ["allowFriendRequests"]]]) {
      if (input[section] === undefined) continue;
      const values = input[section];
      if (!values || typeof values !== "object" || Array.isArray(values) || Object.keys(values).some((key) => !keys.includes(key))) return invalid(`Invalid ${section}`);
      for (const key of keys) {
        if (values[key] === undefined) continue;
        if (typeof values[key] !== "boolean") return invalid(`Invalid ${key}`);
        updates[`${section}.${key}`] = values[key];
      }
    }
    if (!Object.keys(updates).length) return invalid("No profile changes supplied");
    const user = await User.findByIdAndUpdate(req.user._id, {$set: updates}, {new: true, runValidators: true}).select("-hashedPassword");
    if (!user) return res.status(404).json({message: "User not found"});
    return res.status(200).json({user});
  } catch (error) {
    if (error.name === "ValidationError") return res.status(400).json({message: error.message});
    return next(error);
  }
};
