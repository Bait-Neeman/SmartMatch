import { useState } from "react";
import { Button } from "@mui/material";
import { Close, Groups, HourglassTop, HowToReg, Link as LinkIcon, Send } from "@mui/icons-material";
import SuggestionRow from "./SuggestionRow.jsx";
import SuggestionDetail from "./SuggestionDetail.jsx";
import ResumeCard from "./ResumeCard.jsx";
import { RevealedAvatar, RevealedPhoto } from "./RevealedMedia.jsx";
import MatchRing from "../common/MatchRing.jsx";
import { canForward, otherForwardedBanner } from "../../utils/activeSuggestionView.js";

const ICONS = {
  accepted: <HowToReg />,
  forwarded: <HourglassTop />,
  "other-forwarded": <LinkIcon />,
  matchmaker: <Groups />,
};

const messageOf = (error) =>
  (typeof error === "string" && error) || error?.message || "לא הצלחנו לבצע את הפעולה";

export default function ActiveSuggestionCard({
  item,
  variant = "row",
  onOpen,
  onForward,
  onDecline,
}) {
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const view = item.view;
  const icon = ICONS[view.kind] || <HowToReg />;
  const showForward = canForward(view);

  const run = async (action, handler) => {
    try {
      setPending(action);
      setError("");
      await handler(item);
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setPending("");
    }
  };

  const actions = (
    <>
      {showForward ? (
        <Button
          variant="contained"
          size={variant === "row" ? "small" : "medium"}
          startIcon={<Send />}
          disabled={Boolean(pending) || !item.userId}
          onClick={(event) => {
            event.stopPropagation();
            run("forward", onForward);
          }}
        >
          העבר לטיפול שדכן
        </Button>
      ) : null}
      <Button
        variant="outlined"
        size={variant === "row" ? "small" : "medium"}
        startIcon={<Close />}
        disabled={Boolean(pending) || !item.userId}
        onClick={(event) => {
          event.stopPropagation();
          run("decline", onDecline);
        }}
      >
        לא מעוניין להמשיך
      </Button>
    </>
  );

  if (!view.revealed) return null;

  if (variant === "detail") {
    return (
      <SuggestionDetail
        view={view}
        icon={icon}
        actions={actions}
        error={error}
        onBack={onOpen}
        photo={<RevealedPhoto url={view.image} name={view.name} gender={view.gender} />}
        notice={null}
        bannerText={otherForwardedBanner(view)}
        afterText={
          view.resumePdf ? (
            <ResumeCard
              name={view.name}
              url={view.resumePdf}
              size={view.resumeSize}
              uploadedAt={view.resumeUploadedAt}
            />
          ) : null
        }
      />
    );
  }

  return (
    <SuggestionRow
      view={view}
      icon={icon}
      actions={actions}
      error={error}
      onOpen={onOpen}
      leading={<RevealedAvatar url={view.image} name={view.name} gender={view.gender} />}
      showStatus={view.kind !== "accepted"}
      statusPlacement="below"
      percentNode={view.percent == null ? null : <MatchRing value={view.percent} size={64} caption="התאמה" />}
    />
  );
}
