import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import {
  fetchMatches,
  selectMatches,
  selectMatchesError,
  selectMatchesLoading,
  selectMatchesNeedsProfile,
} from "../store/slices/matchesSlice.js";
import {
  fetchInterests,
  selectIncomingInterests,
  selectInterestsError,
  selectInterestsLoading,
  selectOutgoingInterests,
} from "../store/slices/interestsSlice.js";
import { buildSuggestionList, idOf, publicFields } from "../utils/suggestionView.js";

const EMPTY_PREVIEW = { matches: [], incoming: [], outgoing: [] };

let optimistic = [];
const optimisticListeners = new Set();

const emitOptimistic = () => {
  optimisticListeners.forEach((listener) => listener());
};

const subscribeOptimistic = (listener) => {
  optimisticListeners.add(listener);
  return () => optimisticListeners.delete(listener);
};

const getOptimisticSent = () => optimistic;

export const useOptimisticSent = () => useSyncExternalStore(subscribeOptimistic, getOptimisticSent, getOptimisticSent);

export const pushOptimisticSent = (match) => {
  const userId = idOf(match);
  if (!userId || optimistic.some((item) => idOf(item.receiver) === userId)) return;
  optimistic = [
    {
      _id: `local-${userId}`,
      status: "pending",
      receiver: { _id: userId, ...publicFields(match) },
    },
    ...optimistic,
  ];
  emitOptimistic();
};

export const removeOptimisticSent = (userId) => {
  const next = optimistic.filter((item) => idOf(item.receiver) !== userId);
  if (next.length === optimistic.length) return;
  optimistic = next;
  emitOptimistic();
};

export default function useSuggestions() {
  const [params] = useSearchParams();
  const preview = import.meta.env.DEV && params.get("preview") === "1";
  const dispatch = useDispatch();
  const matches = useSelector(selectMatches);
  const incoming = useSelector(selectIncomingInterests);
  const outgoing = useSelector(selectOutgoingInterests);
  const matchesLoading = useSelector(selectMatchesLoading);
  const interestsLoading = useSelector(selectInterestsLoading);
  const matchesError = useSelector(selectMatchesError);
  const interestsError = useSelector(selectInterestsError);
  const needsProfile = useSelector(selectMatchesNeedsProfile);
  const optimisticSent = useOptimisticSent();
  const [settled, setSettled] = useState(!preview);
  const [previewReady, setPreviewReady] = useState(!preview);
  const [previewState, setPreviewState] = useState(EMPTY_PREVIEW);
  const previewApi = useRef(null);

  useEffect(() => {
    if (!import.meta.env.DEV || !preview) return undefined;
    let active = true;
    let unsubscribe = () => {};
    import("../utils/suggestionPreview.js").then((mod) => {
      if (!active) return;
      previewApi.current = mod;
      setPreviewState(mod.getPreviewState());
      setPreviewReady(true);
      unsubscribe = mod.subscribePreview(() => {
        if (active) setPreviewState(mod.getPreviewState());
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
    Promise.all([dispatch(fetchMatches()), dispatch(fetchInterests())]).finally(() => {
      if (active) setSettled(true);
    });
    return () => {
      active = false;
    };
  }, [dispatch, preview]);

  const sourceMatches = preview ? previewState.matches : matches;
  const sourceIncoming = preview ? previewState.incoming : incoming;
  const sourceOutgoing = useMemo(() => {
    if (preview) return previewState.outgoing;
    const taken = new Set(outgoing.map((item) => idOf(item?.receiver)));
    const extra = optimisticSent.filter((item) => !taken.has(idOf(item.receiver)));
    return extra.length ? [...extra, ...outgoing] : outgoing;
  }, [preview, previewState, outgoing, optimisticSent]);

  const items = useMemo(
    () =>
      buildSuggestionList({
        matches: sourceMatches,
        incoming: sourceIncoming,
        outgoing: sourceOutgoing,
      }),
    [sourceMatches, sourceIncoming, sourceOutgoing]
  );

  return {
    items,
    loading: preview ? !previewReady : !settled || ((matchesLoading || interestsLoading) && items.length === 0),
    matchesError: preview || needsProfile ? null : matchesError,
    interestsError: preview ? null : interestsError,
    needsProfile: preview ? false : needsProfile,
    preview,
    offline: preview,
    onSent: (match) => {
      if (preview) previewApi.current?.sendPreviewInterest(match);
      else dispatch(fetchInterests());
    },
    onDeclined: (interest) => {
      if (preview) previewApi.current?.declinePreviewInterest(interest);
    },
    onAccepted: (interest) => {
      if (preview) previewApi.current?.acceptPreviewInterest(interest);
    },
  };
}
