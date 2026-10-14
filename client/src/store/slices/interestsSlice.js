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

// The server returns the updated interest without the other user's details,
// so only its state is copied into the list
const applyInterestUpdate = (list, updated) =>
  list.map((interest) =>
    updated && String(interest._id) === String(updated._id)
      ? {
          ...interest,
          status: updated.status,
          senderApprovedToManager: updated.senderApprovedToManager,
          receiverApprovedToManager: updated.receiverApprovedToManager,
        }
      : interest
  );

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
      const data = await acceptInterestApi(senderId);
      return data?.interest;
    } catch (error) {
      return rejectWithValue(error?.message || "לא הצלחנו לאשר את הפניה");
    }
  }
);

export const rejectInterest = createAsyncThunk(
  "interests/rejectInterest",
  async (senderId, { rejectWithValue }) => {
    try {
      const data = await rejectInterestApi(senderId);
      return data?.interest;
    } catch (error) {
      return rejectWithValue(error?.message || "לא הצלחנו לדחות את הפניה");
    }
  }
);

export const sendToManager = createAsyncThunk(
  "interests/sendToManager",
  async (otherUserId, { rejectWithValue }) => {
    try {
      const data = await sendToManagerApi(otherUserId);
      return data?.interest;
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
        state.incoming = applyInterestUpdate(state.incoming, action.payload);
      })
      .addCase(rejectInterest.fulfilled, (state, action) => {
        state.incoming = applyInterestUpdate(state.incoming, action.payload);
      })
      .addCase(sendToManager.fulfilled, (state, action) => {
        state.incoming = applyInterestUpdate(state.incoming, action.payload);
        state.outgoing = applyInterestUpdate(state.outgoing, action.payload);
      });
    // Failed actions are shown on the card itself (InterestCard), not as a page error
  },
});

export const selectIncomingInterests = (state) => state.interests.incoming;
export const selectOutgoingInterests = (state) => state.interests.outgoing;
export const selectInterestsLoading = (state) => state.interests.loading;
export const selectInterestsError = (state) => state.interests.error;

export default interestsSlice.reducer;
