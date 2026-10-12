import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getAdminUsers,
  getAdminUserProfile,
  getPendingMatches,
  removePendingMatch as removePendingMatchApi,
} from "../../services/admin.service.js";

export const fetchAdminUsers = createAsyncThunk(
  "admin/fetchAdminUsers",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getAdminUsers();
      return data?.users || data?.data || [];
    } catch (error) {
      return rejectWithValue(error?.message || "לא הצלחנו לטעון משתמשים");
    }
  }
);

export const fetchAdminUserProfile = createAsyncThunk(
  "admin/fetchAdminUserProfile",
  async (userId, { rejectWithValue }) => {
    try {
      const data = await getAdminUserProfile(userId);
      return data;
    } catch (error) {
      return rejectWithValue(error?.message || "לא הצלחנו לטעון פרופיל");
    }
  }
);

export const fetchPendingMatches = createAsyncThunk(
  "admin/fetchPendingMatches",
  async (_, { rejectWithValue }) => {
    try {
      const data = await getPendingMatches();
      return data?.matches || data?.data || [];
    } catch (error) {
      return rejectWithValue(error?.message || "לא הצלחנו לטעון הצעות");
    }
  }
);

export const removePendingMatch = createAsyncThunk(
  "admin/removePendingMatch",
  async ({ senderId, receiverId }, { rejectWithValue }) => {
    try {
      await removePendingMatchApi({ senderId, receiverId });
      return { senderId, receiverId };
    } catch (error) {
      return rejectWithValue(error?.message || "לא הצלחנו להסיר את ההצעה");
    }
  }
);

const initialState = {
  users: [],
  pendingMatches: [],
  selectedProfile: null,
  loadingUsers: false,
  loadingProfile: false,
  loadingPendingMatches: false,
  errorUsers: null,
  errorProfile: null,
  errorPendingMatches: null,
};

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminUsers.pending, (state) => {
        state.loadingUsers = true;
        state.errorUsers = null;
      })
      .addCase(fetchAdminUsers.fulfilled, (state, action) => {
        state.users = action.payload;
        state.loadingUsers = false;
      })
      .addCase(fetchAdminUsers.rejected, (state, action) => {
        state.loadingUsers = false;
        state.errorUsers = action.payload || action.error.message;
      })
      .addCase(fetchAdminUserProfile.pending, (state) => {
        state.loadingProfile = true;
        state.errorProfile = null;
      })
      .addCase(fetchAdminUserProfile.fulfilled, (state, action) => {
        state.selectedProfile = action.payload;
        state.loadingProfile = false;
      })
      .addCase(fetchAdminUserProfile.rejected, (state, action) => {
        state.loadingProfile = false;
        state.errorProfile = action.payload || action.error.message;
      })
      .addCase(fetchPendingMatches.pending, (state) => {
        state.loadingPendingMatches = true;
        state.errorPendingMatches = null;
      })
      .addCase(fetchPendingMatches.fulfilled, (state, action) => {
        state.pendingMatches = action.payload;
        state.loadingPendingMatches = false;
      })
      .addCase(fetchPendingMatches.rejected, (state, action) => {
        state.loadingPendingMatches = false;
        state.errorPendingMatches = action.payload || action.error.message;
      })
      .addCase(removePendingMatch.fulfilled, (state, action) => {
        state.pendingMatches = state.pendingMatches.filter((match) => {
          const senderId = match?.sender?._id || match?.sender?.id;
          const receiverId = match?.receiver?._id || match?.receiver?.id;
          return !(senderId === action.payload.senderId && receiverId === action.payload.receiverId);
        });
      })
      .addCase(removePendingMatch.rejected, (state, action) => {
        state.errorPendingMatches = action.payload || action.error.message;
      });
  },
});

export const selectAdminUsers = (state) => state.admin.users;
export const selectAdminUserProfile = (state) => state.admin.selectedProfile;
export const selectAdminUsersLoading = (state) => state.admin.loadingUsers;
export const selectAdminProfileLoading = (state) => state.admin.loadingProfile;
export const selectAdminPendingMatches = (state) => state.admin.pendingMatches;
export const selectAdminPendingMatchesLoading = (state) => state.admin.loadingPendingMatches;
export const selectAdminUsersError = (state) => state.admin.errorUsers;
export const selectAdminProfileError = (state) => state.admin.errorProfile;
export const selectAdminPendingMatchesError = (state) => state.admin.errorPendingMatches;

export default adminSlice.reducer;
