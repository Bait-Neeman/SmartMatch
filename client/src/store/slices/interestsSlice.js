import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getIncomingInterests,
  getOutgoingInterests,
  acceptInterest as acceptInterestApi,
  rejectInterest as rejectInterestApi,
  sendToManager as sendToManagerApi,
} from "../../services/interest.service.js";

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  return data?.interests || data?.data || [];
};

const normalizeId = (item) => {
  if (!item && item !== 0) return item;
  if (typeof item === "object") return item._id || item.id || item.user?._id || item.user || undefined;
  return item;
};

export const fetchInterests = createAsyncThunk(
  "interests/fetchInterests",
  async (_, { rejectWithValue }) => {
    try {
      const [incomingData, outgoingData] = await Promise.all([
        getIncomingInterests(),
        getOutgoingInterests(),
      ]);

      return {
        incoming: normalizeArray(incomingData),
        outgoing: normalizeArray(outgoingData),
      };
    } catch (error) {
      return rejectWithValue(error?.message || "לא הצלחנו לטעון התעניינויות");
    }
  }
);

export const acceptInterest = createAsyncThunk(
  "interests/acceptInterest",
  async (senderId, { rejectWithValue }) => {
    try {
      await acceptInterestApi(senderId);
      return { senderId, status: "accepted" };
    } catch (error) {
      return rejectWithValue(error?.message || "לא הצלחנו לאשר את הפניה");
    }
  }
);

export const rejectInterest = createAsyncThunk(
  "interests/rejectInterest",
  async (senderId, { rejectWithValue }) => {
    try {
      await rejectInterestApi(senderId);
      return { senderId, status: "rejected" };
    } catch (error) {
      return rejectWithValue(error?.message || "לא הצלחנו לדחות את הפניה");
    }
  }
);

export const sendToManager = createAsyncThunk(
  "interests/sendToManager",
  async (otherUserId, { rejectWithValue }) => {
    try {
      await sendToManagerApi(otherUserId);
      return otherUserId;
    } catch (error) {
      return rejectWithValue(error?.message || "לא הצלחנו להעביר לטיפול מנהל");
    }
  }
);

const initialState = {
  incoming: [],
  outgoing: [],
  loading: false,
  error: null,
};

const interestsSlice = createSlice({
  name: "interests",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInterests.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInterests.fulfilled, (state, action) => {
        state.incoming = action.payload.incoming;
        state.outgoing = action.payload.outgoing;
        state.loading = false;
      })
      .addCase(fetchInterests.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || action.error.message;
      })
      .addCase(acceptInterest.fulfilled, (state, action) => {
        const senderId = normalizeId(action.payload.senderId);
        state.incoming = state.incoming.map((interest) => {
          const id = normalizeId(interest?.sender?._id || interest?.sender?.id);
          if (id === senderId) {
            return { ...interest, status: action.payload.status };
          }
          return interest;
        });
      })
      .addCase(rejectInterest.fulfilled, (state, action) => {
        const senderId = normalizeId(action.payload.senderId);
        state.incoming = state.incoming.map((interest) => {
          const id = normalizeId(interest?.sender?._id || interest?.sender?.id);
          if (id === senderId) {
            return { ...interest, status: action.payload.status };
          }
          return interest;
        });
      })
      .addCase(sendToManager.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      });
  },
});

export const selectIncomingInterests = (state) => state.interests.incoming;
export const selectOutgoingInterests = (state) => state.interests.outgoing;
export const selectInterestsLoading = (state) => state.interests.loading;
export const selectInterestsError = (state) => state.interests.error;

export default interestsSlice.reducer;
