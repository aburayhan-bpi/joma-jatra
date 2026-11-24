import {
  IGetProfileResponse,
  IUpdateSelfProfilePayload,
  IUpdateSelfProfileResponse,
} from "@/types/global";
import baseApi from "../baseApi";

const getMeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMe: builder.query<IGetProfileResponse, void>({
      query: () => "/auth/me",
      providesTags: ["User"],
    }),
    updateProfile: builder.mutation<
      IUpdateSelfProfileResponse,
      IUpdateSelfProfilePayload
    >({
      query: (body) => ({
        url: "/auth/me",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["User", "Members", "ActivityLogs", "Dashboard"],
    }),
  }),
});

export const { useGetMeQuery, useLazyGetMeQuery, useUpdateProfileMutation } =
  getMeApi;
