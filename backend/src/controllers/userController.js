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