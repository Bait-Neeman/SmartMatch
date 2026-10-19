const { getInstitutionLists } = require("../services/institution.service");

const listInstitutions = async (req, res) => {
  const lists = await getInstitutionLists();
  res.status(200).json(lists);
};

module.exports = { listInstitutions };
