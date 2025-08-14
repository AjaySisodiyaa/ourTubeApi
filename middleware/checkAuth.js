const jwt = require("jsonwebtoken");

module.exports = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    await jwt.verify(token, process.env.SECRET_KEY);
    next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Unauthorized" });
  }
};
