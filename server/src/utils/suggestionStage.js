// Viewer-relative place of one interest in the suggestion flow.
// A declined row stays in the declined list. Identity is decided separately, from the
// interest status read on this request.
const stageForViewer = (interest, viewerId) => {
  const viewerIsSender = String(interest.sender?._id || interest.sender) === String(viewerId);
  const viewerForwarded = Boolean(
    viewerIsSender ? interest.senderApprovedToManager : interest.receiverApprovedToManager
  );
  const otherForwarded = Boolean(
    viewerIsSender ? interest.receiverApprovedToManager : interest.senderApprovedToManager
  );

  if (interest.status === "rejected") {
    return {
      stage: "declined",
      declinedByViewer: String(interest.rejectedBy || "") === String(viewerId),
      viewerForwarded: false,
      otherForwarded: false,
    };
  }
  if (interest.status === "pending") {
    return {
      stage: viewerIsSender ? "sent" : "received",
      viewerForwarded: false,
      otherForwarded: false,
    };
  }

  if (viewerForwarded && otherForwarded) {
    return { stage: "matchmaker", viewerForwarded, otherForwarded };
  }
  if (viewerForwarded) return { stage: "forwarded", viewerForwarded, otherForwarded };
  if (otherForwarded) return { stage: "other-forwarded", viewerForwarded, otherForwarded };
  return { stage: "active", viewerForwarded, otherForwarded };
};

module.exports = { stageForViewer };
