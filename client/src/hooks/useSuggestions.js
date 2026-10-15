import { useEffect, useMemo, useState } from "react";
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
import { buildSuggestionList, idOf } from "../utils/suggestionView.js";
import {
  acceptPreviewInterest,
  declinePreviewInterest,
  sendPreviewInterest,
  useOptimisticSent,
  usePreviewState,
} from "../utils/suggestionPreview.js";

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
  const previewState = usePreviewState();
  const optimisticSent = useOptimisticSent();
  const [settled, setSettled] = useState(preview);

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
    loading: preview ? false : !settled || ((matchesLoading || interestsLoading) && items.length === 0),
    matchesError: preview || needsProfile ? null : matchesError,
    interestsError: preview ? null : interestsError,
    needsProfile: preview ? false : needsProfile,
    preview,
    offline: preview,
    onSent: (match) => {
      if (preview) sendPreviewInterest(match);
      else dispatch(fetchInterests());
    },
    onDeclined: (interest) => {
      if (preview) declinePreviewInterest(interest);
    },
    onAccepted: (interest) => {
      if (preview) acceptPreviewInterest(interest);
    },
  };
}
