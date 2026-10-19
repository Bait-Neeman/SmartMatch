const { fileAccessPath } = require("./storage.service");

// Shown before both sides have accepted. Name, photo, resume, and contact details are not.
//
// Money fields keep the names already stored on the profile, for either side:
// - financialRequirement is דרישה כספית (financialDemand): a minimum. The other
//   side's participation may be higher and still compatible.
// - financialCapabilities is יכולת כספית. The profile has no separate
//   השתתפות כספית (financialContribution) field; this is the other stored figure.
// - financialStatus is one number for the existing preference range, not that pair.
// yeshiva and seminar are the learning institution (מוסד).
// lookingFor, maritalStatus, financialDemand, and financialParticipation are
// visible before approval, the same as age, city, and the other public fields.
// workplace (where she works) can name an employer, so it stays hidden until
// mutual approval, like a name. A phone number is never sent to another user,
// at any stage. The work checkboxes and מקצוע stay public.
const PUBLIC_PROFILE_FIELDS = [
  "age",
  "height",
  "city",
  "ethnicity",
  "style",
  "appearance",
  "gender",
  "occupation",
  "working",
  "workingInProfession",
  "description",
  "lookingFor",
  "maritalStatus",
  "yeshiva",
  "seminar",
  "financialRequirement",
  "financialCapabilities",
  "financialStatus",
  "financialDemand",
  "financialParticipation",
];

// Never sent to another user, even after mutual approval or a matchmaker stage.
// The national ID and the contact phone stay with the account owner and with admins.
const ALWAYS_SECRET_KEYS = new Set(["password", "idNumber", "phone", "mobile", "telephone"]);

// Identifying keys removed from every suggestion until mutual approval.
// maritalStatus is not one of them: it is a public profile field.
const IDENTITY_KEYS = new Set([
  "name",
  "email",
  "contact",
  "image",
  "resumePdf",
  "photo",
  "resume",
  "photoUrl",
  "resumeUrl",
  "imageUrl",
  "resumeSize",
  "resumeUploadedAt",
  "workplace",
]);

const asPlain = (value) => {
  if (!value) return null;
  if (typeof value.toObject === "function") return value.toObject();
  return value;
};

const isObjectId = (value) =>
  Boolean(value) &&
  (value._bsontype === "ObjectId" ||
    (typeof value.toHexString === "function" && value.constructor?.name === "ObjectId"));

const copyFields = (source, fields) => {
  const copy = {};
  if (!source) return copy;
  for (const field of fields) {
    if (source[field] != null && source[field] !== "") {
      copy[field] = source[field];
    }
  }
  return copy;
};

// Walks a response and drops anything that would identify the other person.
// `revealIdentity` is true only when the interest between the two users is accepted.
const redactIdentity = (value, { revealIdentity }) => {
  if (Array.isArray(value)) {
    return value.map((item) => redactIdentity(item, { revealIdentity }));
  }
  if (!value || typeof value !== "object") return value;
  if (value instanceof Date || isObjectId(value)) return value;

  const output = {};
  for (const [key, child] of Object.entries(value)) {
    if (ALWAYS_SECRET_KEYS.has(key)) continue;
    if (!revealIdentity && IDENTITY_KEYS.has(key)) continue;
    output[key] = redactIdentity(child, { revealIdentity });
  }
  return output;
};

// A view of another user. The caller's own profile is never passed through here.
const toPublicPerson = (user, profile, { revealIdentity }) => {
  const plainUser = asPlain(user);
  const plainProfile = asPlain(profile);
  const id = plainUser?._id || (plainProfile?.user?._id ?? plainProfile?.user);

  const person = {
    ...(id != null ? { _id: id } : {}),
    ...copyFields(plainProfile, PUBLIC_PROFILE_FIELDS),
  };

  if (revealIdentity) {
    person.name = plainUser?.name ?? null;
    person.email = plainUser?.email ?? null;
    // Stable file paths. Opening them checks that the match is still accepted.
    person.image = fileAccessPath(id, "image", plainProfile?.image);
    person.resumePdf = fileAccessPath(id, "resumePdf", plainProfile?.resumePdf);
    if (plainProfile?.resumeSize != null) person.resumeSize = plainProfile.resumeSize;
    if (plainProfile?.resumeUploadedAt) person.resumeUploadedAt = plainProfile.resumeUploadedAt;
    if (plainProfile?.workplace) person.workplace = plainProfile.workplace;
  }

  return redactIdentity(person, { revealIdentity });
};

module.exports = {
  toPublicPerson,
  redactIdentity,
  PUBLIC_PROFILE_FIELDS,
};
