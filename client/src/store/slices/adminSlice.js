import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  getAdminUsers,
  getAdminUserProfile,
  getPendingMatches,
  removePendingMatch as removePendingMatchApi,
  getAdminSummary,
  getAdminCases,
  updateAdminCase as updateAdminCaseApi,
  getAdminSettings,
  updateAdminSettings as updateAdminSettingsApi,
  updateAdminAccount as updateAdminAccountApi,
} from "../../services/admin.service.js";

const messageOf = (error, fallback) => error?.message || fallback;

export const fetchAdminUsers = createAsyncThunk("admin/fetchAdminUsers", async (_, { rejectWithValue }) => {
  try {
    const data = await getAdminUsers();
    return data?.users || [];
  } catch (error) {
    return rejectWithValue(messageOf(error, "לא הצלחנו לטעון משתמשים"));
  }
});

export const fetchAdminUserProfile = createAsyncThunk(
  "admin/fetchAdminUserProfile",
  async (userId, { rejectWithValue }) => {
    try {
      return await getAdminUserProfile(userId);
    } catch (error) {
      return rejectWithValue(messageOf(error, "לא הצלחנו לטעון פרופיל"));
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
      return rejectWithValue(messageOf(error, "לא הצלחנו לטעון הצעות"));
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
      return rejectWithValue(messageOf(error, "לא הצלחנו להסיר את ההצעה"));
    }
  }
);

export const fetchAdminSummary = createAsyncThunk("admin/fetchAdminSummary", async (_, { rejectWithValue }) => {
  try {
    return await getAdminSummary();
  } catch (error) {
    return rejectWithValue(messageOf(error, "לא הצלחנו לטעון את הדשבורד"));
  }
});

export const fetchAdminCases = createAsyncThunk("admin/fetchAdminCases", async (_, { rejectWithValue }) => {
  try {
    return await getAdminCases();
  } catch (error) {
    return rejectWithValue(messageOf(error, "לא הצלחנו לטעון תיקים"));
  }
});

export const saveAdminCase = createAsyncThunk(
  "admin/saveAdminCase",
  async ({ id, status, meetingNumber, note, action }, { rejectWithValue }) => {
    try {
      const payload = {};
      if (action !== undefined) payload.action = action;
      if (status !== undefined) payload.status = status;
      if (meetingNumber !== undefined) payload.meetingNumber = meetingNumber;
      if (note !== undefined) payload.note = note;
      const data = await updateAdminCaseApi(id, payload);
      return data?.case;
    } catch (error) {
      return rejectWithValue(messageOf(error, "לא הצלחנו לעדכן את התיק"));
    }
  }
);

export const fetchAdminSettings = createAsyncThunk("admin/fetchAdminSettings", async (_, { rejectWithValue }) => {
  try {
    return await getAdminSettings();
  } catch (error) {
    return rejectWithValue(messageOf(error, "לא הצלחנו לטעון הגדרות"));
  }
});

export const saveAdminSettings = createAsyncThunk(
  "admin/saveAdminSettings",
  async (payload, { rejectWithValue }) => {
    try {
      return await updateAdminSettingsApi(payload);
    } catch (error) {
      return rejectWithValue(messageOf(error, "לא הצלחנו לשמור הגדרות"));
    }
  }
);

export const saveAdminAccount = createAsyncThunk(
  "admin/saveAdminAccount",
  async (payload, { rejectWithValue }) => {
    try {
      return await updateAdminAccountApi(payload);
    } catch (error) {
      return rejectWithValue(messageOf(error, "לא הצלחנו לשמור את הפרופיל"));
    }
  }
);

const initialState = {
  users: [],
  pendingMatches: [],
  cases: [],
  suggestions: [],
  revealIdentity: true,
  summary: null,
  settings: null,
  account: null,
  team: [],
  selectedProfile: null,
  loadingUsers: false,
  loadingPendingMatches: false,
  loadingCases: false,
  loadingSummary: false,
  loadingSettings: false,
  loadingProfile: false,
  errorUsers: null,
  errorPendingMatches: null,
  errorCases: null,
  errorSummary: null,
  errorSettings: null,
  errorProfile: null,
};

const adminSlice = createSlice({
  name: "admin",
  initialState,
  reducers: {
    clearAdminProfile(state) {
      state.selectedProfile = null;
      state.errorProfile = null;
    },
  },
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
      })
      .addCase(fetchAdminSummary.pending, (state) => {
        state.loadingSummary = true;
        state.errorSummary = null;
      })
      .addCase(fetchAdminSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
        state.revealIdentity = action.payload?.revealIdentity !== false;
        state.loadingSummary = false;
      })
      .addCase(fetchAdminSummary.rejected, (state, action) => {
        state.loadingSummary = false;
        state.errorSummary = action.payload || action.error.message;
      })
      .addCase(fetchAdminCases.pending, (state) => {
        state.loadingCases = true;
        state.errorCases = null;
      })
      .addCase(fetchAdminCases.fulfilled, (state, action) => {
        state.cases = action.payload?.cases || [];
        state.suggestions = action.payload?.suggestions || [];
        state.revealIdentity = action.payload?.revealIdentity !== false;
        state.loadingCases = false;
      })
      .addCase(fetchAdminCases.rejected, (state, action) => {
        state.loadingCases = false;
        state.errorCases = action.payload || action.error.message;
      })
      .addCase(saveAdminCase.fulfilled, (state, action) => {
        const saved = action.payload;
        if (!saved) return;
        state.cases = state.cases.map((item) => (String(item._id) === String(saved._id) ? saved : item));
        state.suggestions = state.suggestions.map((item) =>
          String(item._id) === String(saved._id)
            ? {
                ...item,
                status: saved.status,
                meetingNumber: saved.meetingNumber,
                label: saved.label,
                history: saved.history,
                note: saved.note,
                manageable: true,
                stage: item.stage || "matchmaker",
              }
            : item
        );
        if (state.summary?.recent) {
          state.summary.recent = state.summary.recent.map((item) =>
            String(item._id) === String(saved._id) ? saved : item
          );
        }
      })
      .addCase(saveAdminCase.rejected, (state, action) => {
        state.errorCases = action.payload || action.error.message;
      })
      .addCase(fetchAdminSettings.pending, (state) => {
        state.loadingSettings = true;
        state.errorSettings = null;
      })
      .addCase(fetchAdminSettings.fulfilled, (state, action) => {
        state.settings = action.payload?.settings || null;
        state.account = action.payload?.account || null;
        state.team = action.payload?.team || [];
        state.revealIdentity = action.payload?.settings?.revealIdentity !== false;
        state.loadingSettings = false;
      })
      .addCase(fetchAdminSettings.rejected, (state, action) => {
        state.loadingSettings = false;
        state.errorSettings = action.payload || action.error.message;
      })
      .addCase(saveAdminSettings.fulfilled, (state, action) => {
        state.settings = action.payload?.settings || state.settings;
        state.account = action.payload?.account || state.account;
        state.team = action.payload?.team || state.team;
        state.revealIdentity = action.payload?.settings?.revealIdentity !== false;
      })
      .addCase(saveAdminSettings.rejected, (state, action) => {
        state.errorSettings = action.payload || action.error.message;
      })
      .addCase(saveAdminAccount.fulfilled, (state, action) => {
        state.account = { ...state.account, ...action.payload?.account };
        if (state.settings && action.payload?.account?.activityArea != null) {
          state.settings.activityArea = action.payload.account.activityArea;
        }
      })
      .addCase(saveAdminAccount.rejected, (state, action) => {
        state.errorSettings = action.payload || action.error.message;
      });
  },
});

export const { clearAdminProfile } = adminSlice.actions;

export const selectAdminUsers = (state) => state.admin.users;
export const selectAdminUserProfile = (state) => state.admin.selectedProfile;
export const selectAdminUsersLoading = (state) => state.admin.loadingUsers;
export const selectAdminProfileLoading = (state) => state.admin.loadingProfile;
export const selectAdminUsersError = (state) => state.admin.errorUsers;
export const selectAdminProfileError = (state) => state.admin.errorProfile;
export const selectAdminPendingMatches = (state) => state.admin.pendingMatches;
export const selectAdminPendingMatchesLoading = (state) => state.admin.loadingPendingMatches;
export const selectAdminPendingMatchesError = (state) => state.admin.errorPendingMatches;
export const selectAdminSummary = (state) => state.admin.summary;
export const selectAdminSummaryLoading = (state) => state.admin.loadingSummary;
export const selectAdminSummaryError = (state) => state.admin.errorSummary;
export const selectAdminCases = (state) => state.admin.cases;
export const selectAdminSuggestions = (state) => state.admin.suggestions;
export const selectAdminCasesLoading = (state) => state.admin.loadingCases;
export const selectAdminCasesError = (state) => state.admin.errorCases;
export const selectAdminRevealIdentity = (state) => state.admin.revealIdentity;
export const selectAdminSettings = (state) => state.admin.settings;
export const selectAdminAccount = (state) => state.admin.account;
export const selectAdminTeam = (state) => state.admin.team;
export const selectAdminSettingsLoading = (state) => state.admin.loadingSettings;
export const selectAdminSettingsError = (state) => state.admin.errorSettings;

export default adminSlice.reducer;
