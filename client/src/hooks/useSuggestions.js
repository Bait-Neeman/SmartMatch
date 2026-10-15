import { useCallback, useEffect, useMemo, useState } from "react";
import { getSuggestionLists, profileRequired } from "../services/suggestion.service.js";
import { getSettings } from "../services/settings.service.js";
import { buildSuggestionList } from "../utils/suggestionView.js";

const EMPTY = { newSuggestions: [], sent: [], received: [], declined: [] };

export default function useSuggestions() {
  const [payload, setPayload] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [needsProfile, setNeedsProfile] = useState(false);
  const [showMatchPercent, setShowMatchPercent] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await getSuggestionLists();
      setPayload(data || EMPTY);
      setError("");
      setNeedsProfile(false);
    } catch (err) {
      const missing = profileRequired(err);
      setNeedsProfile(missing);
      setError(missing ? "" : err?.message || "לא הצלחנו לטעון הצעות");
      if (missing) setPayload(EMPTY);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getSuggestionLists()
      .then((data) => {
        if (!active) return;
        setPayload(data || EMPTY);
        setError("");
        setNeedsProfile(false);
      })
      .catch((err) => {
        if (!active) return;
        const missing = profileRequired(err);
        setNeedsProfile(missing);
        setError(missing ? "" : err?.message || "לא הצלחנו לטעון הצעות");
        if (missing) setPayload(EMPTY);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    getSettings()
      .then((data) => {
        if (!active) return;
        if (typeof data?.settings?.showMatchPercent === "boolean") {
          setShowMatchPercent(data.settings.showMatchPercent);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const items = useMemo(() => buildSuggestionList(payload), [payload]);

  return {
    items,
    loading: !ready,
    matchesError: null,
    interestsError: error,
    needsProfile,
    preview: false,
    offline: false,
    showMatchPercent,
    onSent: () => load(),
    onDeclined: () => load(),
    onAccepted: () => load(),
  };
};
