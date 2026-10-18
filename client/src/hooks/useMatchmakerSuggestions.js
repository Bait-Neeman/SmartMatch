import { useEffect, useMemo, useState } from "react";
import { rejectInterest } from "../services/interest.service.js";
import { getSuggestionLists, profileRequired } from "../services/suggestion.service.js";
import { buildMatchmakerItems } from "../utils/matchmakerView.js";

export default function useMatchmakerSuggestions() {
  const [payload, setPayload] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [needsProfile, setNeedsProfile] = useState(false);

  useEffect(() => {
    let active = true;
    getSuggestionLists()
      .then((data) => {
        if (!active) return;
        setPayload(data);
        setError("");
        setReady(true);
      })
      .catch((err) => {
        if (!active) return;
        setNeedsProfile(profileRequired(err));
        setError(profileRequired(err) ? "" : err?.message || "לא הצלחנו לטעון הצעות בטיפול שדכן");
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const items = useMemo(() => buildMatchmakerItems(payload), [payload]);

  const reload = async () => {
    const data = await getSuggestionLists();
    setPayload(data);
    setError("");
    setNeedsProfile(false);
  };

  return {
    items,
    loading: !ready,
    error,
    needsProfile,
    decline: async (item) => {
      await rejectInterest(item.userId);
      await reload();
    },
  };
}
