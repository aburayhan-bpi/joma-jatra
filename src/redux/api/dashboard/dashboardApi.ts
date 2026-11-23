import {
  IActivityLogsQuery,
  IActivityLogsResponse,
  IDashboardSummaryResponse,
  IMonthlyMatrixQuery,
  IMonthlyMatrixResponse,
} from "@/types/global";
import baseApi from "../baseApi";

const dashboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDashboardSummary: builder.query<
      IDashboardSummaryResponse,
      { month?: string } | void
    >({
      query: (params) => ({
        url: "/dashboard/summary",
        params: params || undefined,
      }),
      providesTags: ["Dashboard"],
    }),
    getMonthlyMatrix: builder.query<
      IMonthlyMatrixResponse,
      IMonthlyMatrixQuery | void
    >({
      query: (params) => ({
        url: "/dashboard/monthly-matrix",
        params: params || undefined,
      }),
      providesTags: ["Dashboard", "Deposits", "MonthlyTargets", "Members"],
    }),
    getActivityLogs: builder.query<
      IActivityLogsResponse,
      IActivityLogsQuery | void
    >({
      query: (params) => ({
        url: "/activity-logs",
        params: params || undefined,
      }),
      providesTags: ["ActivityLogs"],
    }),
  }),
});

export const {
  useGetDashboardSummaryQuery,
  useGetMonthlyMatrixQuery,
  useGetActivityLogsQuery,
} = dashboardApi;
