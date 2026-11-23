import {
  ICreateReturnPayload,
  IReturnResponse,
  IReturnsQuery,
  IReturnsResponse,
  IReviewReturnPayload,
  ISoftDeleteResponse,
  IUpdateReturnPayload,
} from "@/types/global";
import baseApi from "../baseApi";

const returnsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getReturns: builder.query<IReturnsResponse, IReturnsQuery | void>({
      query: (params) => ({
        url: "/returns",
        params: params || undefined,
      }),
      providesTags: ["Returns"],
    }),
    createReturn: builder.mutation<IReturnResponse, ICreateReturnPayload>({
      query: (body) => ({
        url: "/returns",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "Returns",
        "Dashboard",
        "Members",
        "PaymentAccounts",
        "ActivityLogs",
        "User",
      ],
    }),
    updateReturn: builder.mutation<IReturnResponse, IUpdateReturnPayload>({
      query: ({ id, ...body }) => ({
        url: `/returns/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        "Returns",
        "Dashboard",
        "Members",
        "PaymentAccounts",
        "ActivityLogs",
        "User",
      ],
    }),
    reviewReturn: builder.mutation<IReturnResponse, IReviewReturnPayload>({
      query: ({ id, ...body }) => ({
        url: `/returns/${id}/review`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        "Returns",
        "Dashboard",
        "Members",
        "PaymentAccounts",
        "ActivityLogs",
        "User",
      ],
    }),
    deleteReturn: builder.mutation<ISoftDeleteResponse, string>({
      query: (id) => ({
        url: `/returns/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        "Returns",
        "Dashboard",
        "Members",
        "PaymentAccounts",
        "ActivityLogs",
        "User",
      ],
    }),
    restoreReturn: builder.mutation<IReturnResponse, string>({
      query: (id) => ({
        url: `/returns/${id}/restore`,
        method: "PATCH",
      }),
      invalidatesTags: [
        "Returns",
        "Dashboard",
        "Members",
        "PaymentAccounts",
        "ActivityLogs",
        "User",
      ],
    }),
  }),
});

export const {
  useGetReturnsQuery,
  useCreateReturnMutation,
  useUpdateReturnMutation,
  useReviewReturnMutation,
  useDeleteReturnMutation,
  useRestoreReturnMutation,
} = returnsApi;
