const { openProfileFile } = require("../services/file.service");

const openFile = async (req, res) => {
  const file = await openProfileFile(req.user, req.params.userId, req.params.kind);
  res.set("Cache-Control", "private, no-store");
  res.set("Pragma", "no-cache");
  res.set("Content-Type", file.contentType);
  res.set("Content-Disposition", `inline; filename="${file.filename}"`);
  res.status(200).send(file.body);
};

module.exports = { openFile };
