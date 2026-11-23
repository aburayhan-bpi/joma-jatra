import { IAuthUser } from "@/types/global";
import { decodeJWT } from "@/utils/decodeJWT";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import Cookies from "js-cookie";

export type AuthUser = IAuthUser;

export interface AuthState {
  user: IAuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  resetPassToken: string | null;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  resetPassToken: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<IAuthUser | null>) => {
      state.user = action.payload;
    },

    setTokens: (
      state,
      action: PayloadAction<{ accessToken: string; refreshToken?: string }>,
    ) => {
      const { accessToken, refreshToken } = action.payload;
      state.accessToken = accessToken;
      if (refreshToken !== undefined) {
        state.refreshToken = refreshToken;
      }

      let accessExpires: Date | undefined;
      let refreshExpires: Date | undefined;

      try {
        const decodedAccess = decodeJWT<{ exp?: number }>(accessToken);
        if (decodedAccess?.exp) {
          accessExpires = new Date(decodedAccess.exp * 1000);
        }
      } catch (e) {
        console.error("Error decoding access token:", e);
      }

      if (refreshToken) {
        try {
          const decodedRefresh = decodeJWT<{ exp?: number }>(refreshToken);
          if (decodedRefresh?.exp) {
            refreshExpires = new Date(decodedRefresh.exp * 1000);
          }
        } catch (e) {
          console.error("Error decoding refresh token:", e);
        }
      }

      Cookies.set("accessToken", accessToken, { expires: accessExpires || 7 });
      if (refreshToken) {
        Cookies.set("refreshToken", refreshToken, {
          expires: refreshExpires || 30,
        });
      }
    },

    setResetPassToken: (state, action: PayloadAction<string>) => {
      state.resetPassToken = action.payload;
    },

    clearResetPassToken: (state) => {
      state.resetPassToken = null;
    },

    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;

      Cookies.remove("authUser");
      Cookies.remove("accessToken");
      Cookies.remove("refreshToken");
      Cookies.remove("auth_token");
    },

    clearAuthError: () => {},
  },
});

export const {
  setUser,
  setTokens,
  logout,
  clearAuthError,
  setResetPassToken,
  clearResetPassToken,
} = authSlice.actions;

export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectCurrentUser = selectUser;

export default authSlice.reducer;
