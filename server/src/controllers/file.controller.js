const { openProfileFile } = require("../services/file.service");
const { contentDispositionHeader } = require("../utils/resumeFile");

const openFile = async (req, res) => {
  const file = await openProfileFile(req.user, req.params.userId, req.params.kind);
  res.set("Cache-Control", "private, no-store");
  res.set("Pragma", "no-cache");
  res.set("Content-Type", file.contentType);
  res.set("Content-Disposition", contentDispositionHeader(file.disposition, file.filename));
  res.status(200).send(file.body);
};

module.exports = { openFile };
