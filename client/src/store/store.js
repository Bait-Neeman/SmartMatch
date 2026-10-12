import { configureStore } from "@reduxjs/toolkit";
import matchesReducer from "./slices/matchesSlice.js";
import interestsReducer from "./slices/interestsSlice.js";
import adminReducer from "./slices/adminSlice.js";

export const store = configureStore({
  reducer: {
    matches: matchesReducer,
    interests: interestsReducer,
    admin: adminReducer,
  },
});
