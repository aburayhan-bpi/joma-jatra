import {
  IListQueryParams,
  IMonthlyTargetResponse,
  IMonthlyTargetsResponse,
  IUpsertMonthlyTargetPayload,
} from "@/types/global";
import baseApi from "../baseApi";

const targetsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMonthlyTargets: builder.query<
      IMonthlyTargetsResponse,
      IListQueryParams | void
    >({
      query: (params) => ({
        url: "/monthly-targets",
        params: params || undefined,
      }),
      providesTags: ["MonthlyTargets"],
    }),
    getMonthlyTargetByMonth: builder.query<IMonthlyTargetResponse, string>({
      query: (month) => `/monthly-targets/${month}`,
      providesTags: ["MonthlyTargets"],
    }),
    upsertMonthlyTarget: builder.mutation<
      IMonthlyTargetResponse,
      IUpsertMonthlyTargetPayload
    >({
      query: (body) => ({
        url: "/monthly-targets",
        method: "PUT",
        body,
      }),
      invalidatesTags: ["MonthlyTargets", "Dashboard", "ActivityLogs"],
    }),
  }),
});

export const {
  useGetMonthlyTargetsQuery,
  useGetMonthlyTargetByMonthQuery,
  useUpsertMonthlyTargetMutation,
} = targetsApi;
