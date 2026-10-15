import { useSyncExternalStore } from "react";
import { idOf, publicFields } from "./suggestionView.js";

const DESCRIPTION =
  "בחור שמח ורציני, עם לב פתוח ויחס חם לכל אדם. לומד בבוקר בכולל ועובד אחר הצהריים כמפתח תוכנה, ומשתדל לשלב בין עולם התורה לפרנסה בצורה מכובדת. אוהב שיחות עומק, טיולים בטבע ומוזיקה יהודית.";

const LOOKING_FOR =
  "מחפש בת זוג עם מידות טובות, רגישה ושמחה, שרואה בבניית בית של תורה ערך מרכזי. חשוב לי שתהיה פתוחה לשיחה כנה, בעלת שאיפות אישיות ואכפתיות למשפחה ולסביבה.";

const hidden = {
  name: "לא להציג",
  email: "secret@example.com",
  phone: "0500000000",
  image: "https://example.invalid/missing-photo.jpg",
  resumePdf: "resume.pdf",
};

const person = (fields) => ({ ...hidden, gender: "male", description: DESCRIPTION, lookingFor: LOOKING_FOR, ...fields });

const initialPreview = () => ({
  matches: [
    person({
      _id: "new-26",
      age: 26,
      city: "ירושלים",
      occupation: "תואר ראשון",
      height: 176,
      ethnicity: "ashkenazi",
      yeshiva: "ישיבת חברון",
      financialRequirement: "ללא דרישה קשיחה",
      financialCapabilities: "השתתפות לפי יכולת",
      matchPercent: 95,
    }),
    person({
      _id: "new-29",
      age: 29,
      city: "בית שמש",
      occupation: "עובד בהייטק",
      height: 180,
      ethnicity: "sephardic",
      yeshiva: "ישיבה גבוהה",
      financialRequirement: "גמיש",
      financialCapabilities: "יציב",
      matchPercent: 85,
    }),
    person({
      _id: "new-25",
      age: 25,
      city: "אלעד",
      yeshiva: "ישיבת מיר",
      height: 174,
      ethnicity: "ashkenazi",
      financialRequirement: "צניעות",
      financialCapabilities: "השתתפות חלקית",
      matchPercent: 84,
    }),
  ],
  outgoing: [
    {
      _id: "sent-28",
      status: "pending",
      receiver: person({
        _id: "user-28",
        age: 28,
        city: "בני ברק",
        occupation: "ישיבה גבוהה",
        yeshiva: "ישיבה גבוהה",
        height: 178,
        ethnicity: "ashkenazi",
        financialRequirement: "ללא דרישה",
        financialCapabilities: "השתתפות לפי יכולת",
        matchPercent: 90,
      }),
    },
    {
      _id: "sent-rejected",
      status: "rejected",
      receiver: person({ _id: "user-rejected-out", age: 31, city: "חיפה", occupation: "לא אמור להופיע" }),
    },
  ],
  incoming: [
    {
      _id: "received-27",
      status: "pending",
      sender: person({
        _id: "user-27",
        age: 27,
        city: "מודיעין עילית",
        occupation: "כולל",
        yeshiva: "ישיבה גבוהה",
        height: 178,
        ethnicity: "ashkenazi",
        financialRequirement: "ללא דרישה קשיחה",
        financialCapabilities: "השתתפות לפי יכולת",
        matchPercent: 88,
      }),
    },
    {
      _id: "received-accepted",
      status: "accepted",
      sender: person({ _id: "user-accepted", age: 30, city: "תל אביב", name: "יוסי כהן", occupation: "לא אמור להופיע" }),
    },
    {
      _id: "received-rejected",
      status: "rejected",
      sender: person({ _id: "user-rejected-in", age: 24, city: "צפת", occupation: "לא אמור להופיע" }),
    },
  ],
});

let previewState = initialPreview();
const listeners = new Set();

const emit = () => {
  listeners.forEach((listener) => listener());
};

export const subscribePreview = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getPreviewState = () => previewState;

export const usePreviewState = () => useSyncExternalStore(subscribePreview, getPreviewState, getPreviewState);

export const sendPreviewInterest = (match) => {
  const userId = idOf(match);
  previewState = {
    ...previewState,
    matches: previewState.matches.filter((item) => idOf(item) !== userId),
    outgoing: [
      {
        _id: `sent-${userId}`,
        status: "pending",
        receiver: { _id: userId, ...publicFields(match) },
      },
      ...previewState.outgoing,
    ],
  };
  emit();
};

export const declinePreviewInterest = (interest) => {
  const interestId = idOf(interest);
  previewState = {
    ...previewState,
    incoming: previewState.incoming.filter((item) => idOf(item) !== interestId),
    outgoing: previewState.outgoing.filter((item) => idOf(item) !== interestId),
  };
  emit();
};

export const acceptPreviewInterest = (interest) => {
  const interestId = idOf(interest);
  previewState = {
    ...previewState,
    incoming: previewState.incoming.map((item) =>
      idOf(item) === interestId ? { ...item, status: "accepted" } : item
    ),
  };
  emit();
};

let optimistic = [];
const optimisticListeners = new Set();

const emitOptimistic = () => {
  optimisticListeners.forEach((listener) => listener());
};

export const subscribeOptimistic = (listener) => {
  optimisticListeners.add(listener);
  return () => optimisticListeners.delete(listener);
};

export const getOptimisticSent = () => optimistic;

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
