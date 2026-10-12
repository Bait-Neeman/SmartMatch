const {
  createProfileForUser,
  getProfileByUserId,
  updateProfileByUserId,
  deleteProfileByUserId,
  getProfileWithAccess,
} = require("../services/profile.service");
const path = require("path");

const removeEmptyStrings = (data) => {
  Object.keys(data).forEach((key) => {
    if (data[key] === "") {
      delete data[key];
    }
  });

  return data;
};

const getUploadedFilePath = (files, fieldNames) => {
  for (const name of fieldNames) {
    if (files?.[name]?.[0]?.path) {
      return files[name][0].path;
    }
  }
  return null;
};

const createProfile = async (req, res) => {
  console.log('\n=== CREATE PROFILE CALLED ===');
  console.log('User ID:', req.user?.userId);
  console.log('Files received:', req.files ? Object.keys(req.files) : 'none');
  console.log('Body keys:', Object.keys(req.body));
  
  try {
    const userId = req.user.userId;
    if (!userId) {
      console.log('ERROR: No userId found');
      return res.status(400).json({ message: "User ID not found" });
    }

    const profileData = removeEmptyStrings({ ...req.body });
    console.log('Profile data after removeEmpty:', profileData);

    const resumePDFPath = getUploadedFilePath(req.files, ['resumePdf', 'resumePDF']);
    const profileImagePath = getUploadedFilePath(req.files, ['image', 'profileImage']);

    console.log('Resume PDF path:', resumePDFPath);
    console.log('Profile image path:', profileImagePath);

    if (resumePDFPath) profileData.resumePdf = `pdfs/${path.basename(resumePDFPath)}`;
    if (profileImagePath) profileData.image = `images/${path.basename(profileImagePath)}`;

    console.log('Calling createProfileForUser...');
    const profile = await createProfileForUser(userId, profileData);
    console.log('Profile created successfully:', profile._id);
    
    return res.status(201).json({ message: "Profile created successfully", profile });
  } catch (error) {
    console.error('ERROR in createProfile:', error.message);
    if (error.message === "Profile already exists") {
      return res.status(400).json({ message: error.message });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

const getMyProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const profile = await getProfileByUserId(userId);

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.status(200).json({ message: "Profile retrieved successfully", profile });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const requesterId = req.user.userId;
    const requesterRole = req.user.role;
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const profile = await getProfileWithAccess(requesterId, userId, requesterRole);
    res.status(200).json({ message: "Profile retrieved successfully", profile });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  console.log('\n=== UPDATE PROFILE CALLED ===');
  console.log('User ID:', req.user?.userId);
  console.log('Files received:', req.files ? Object.keys(req.files) : 'none');
  console.log('Body keys:', Object.keys(req.body));
  
  try {
    const userId = req.user.userId;
    if (!userId) {
      console.log('ERROR: No userId found');
      return res.status(400).json({ message: "User ID not found" });
    }

    const profileData = removeEmptyStrings({ ...req.body });
    console.log('Profile data after removeEmpty:', profileData);

    const resumePDFPath = getUploadedFilePath(req.files, ['resumePdf', 'resumePDF']);
    const profileImagePath = getUploadedFilePath(req.files, ['image', 'profileImage']);

    console.log('Resume PDF path:', resumePDFPath);
    console.log('Profile image path:', profileImagePath);

    if (resumePDFPath) profileData.resumePdf = `pdfs/${path.basename(resumePDFPath)}`;
    if (profileImagePath) profileData.image = `images/${path.basename(profileImagePath)}`;

    console.log('Calling updateProfileByUserId...');
    const profile = await updateProfileByUserId(userId, profileData);

    if (!profile) {
      console.log('ERROR: Profile not found for user', userId);
      return res.status(404).json({ message: "Profile not found" });
    }

    console.log('Profile updated successfully:', profile._id);
    return res.status(200).json({ message: "Profile updated successfully", profile });
  } catch (error) {
    console.error('ERROR in updateProfile:', error.message);
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message });
  }
};

const deleteProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return res.status(400).json({ message: "User ID not found" });
    }

    const result = await deleteProfileByUserId(userId);
    if (!result) {
      return res.status(404).json({ message: "Profile not found" });
    }

    res.status(200).json({ message: "Profile deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createProfile, getMyProfile, updateProfile, getProfile, deleteProfile };
