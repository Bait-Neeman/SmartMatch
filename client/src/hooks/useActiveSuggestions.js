import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { rejectInterest, sendToManager } from "../services/interest.service.js";
import { getSuggestionLists, profileRequired } from "../services/suggestion.service.js";
import { buildActiveItems } from "../utils/activeSuggestionView.js";

export default function useActiveSuggestions() {
  const [params] = useSearchParams();
  const preview = import.meta.env.DEV && params.get("preview") === "1";
  const previewApi = useRef(null);
  const [payload, setPayload] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [needsProfile, setNeedsProfile] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV || !preview) return undefined;
    let active = true;
    let unsubscribe = () => {};
    import("../utils/activeSuggestionPreview.js").then((mod) => {
      if (!active) return;
      previewApi.current = mod;
      setPayload(mod.getPreviewPayload());
      setReady(true);
      unsubscribe = mod.subscribePreview(() => {
        if (active) setPayload(mod.getPreviewPayload());
      });
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [preview]);

  useEffect(() => {
    if (preview) return undefined;
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
        setError(profileRequired(err) ? "" : err?.message || "לא הצלחנו לטעון הצעות פעילות");
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [preview]);

  const items = useMemo(() => buildActiveItems(payload), [payload]);

  const reload = async () => {
    const data = await getSuggestionLists();
    setPayload(data);
    setError("");
  };

  return {
    items,
    loading: !ready,
    error,
    needsProfile,
    preview,
    forward: async (item) => {
      if (preview) {
        previewApi.current?.forwardPreview(item.userId);
        return;
      }
      await sendToManager(item.userId);
      await reload();
    },
    decline: async (item) => {
      if (preview) {
        previewApi.current?.declinePreview(item.userId);
        return;
      }
      await rejectInterest(item.userId);
      await reload();
    },
  };
}
