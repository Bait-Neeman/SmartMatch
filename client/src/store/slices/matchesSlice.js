import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getMatches } from "../../services/match.service.js";
import { sendInterest as sendInterestApi } from "../../services/interest.service.js";

const normalizeCandidates = (data) => {
  if (Array.isArray(data)) return data;
  return data?.candidates || data?.matches || data?.data || [];
};

const normalizeId = (item) => {
  if (!item && item !== 0) return item;
  if (typeof item === "object") return item._id || item.id || item.user?._id || item.user || undefined;
  return item;
};

export const fetchMatches = createAsyncThunk(
  "matches/fetchMatches",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getMatches();
      return normalizeCandidates(data);
    } catch (error) {
      return rejectWithValue(error?.message || "לא הצלחנו לטעון התאמות");
    }
  }
);

export const sendInterest = createAsyncThunk(
  "matches/sendInterest",
  async (receiverId, { rejectWithValue }) => {
    try {
      await sendInterestApi(receiverId);
      return receiverId;
    } catch (error) {
      return rejectWithValue(error?.message || "לא הצלחנו לשלוח התעניינות");
    }
  }
);

const initialState = {
  items: [],
  loading: false,
  error: null,
};

const matchesSlice = createSlice({
  name: "matches",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMatches.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMatches.fulfilled, (state, action) => {
        state.items = action.payload;
        state.loading = false;
      })
      .addCase(fetchMatches.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(sendInterest.fulfilled, (state, action) => {
        const receiverId = normalizeId(action.payload);
        state.items = state.items.filter((match) => {
          const id = normalizeId(match?._id || match?.id || match?.user?._id || match?.user);
          return id !== receiverId;
        });
      })
      .addCase(sendInterest.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      });
  },
});

export const selectMatches = (state) => state.matches.items;
export const selectMatchesLoading = (state) => state.matches.loading;
export const selectMatchesError = (state) => state.matches.error;

export default matchesSlice.reducer;
