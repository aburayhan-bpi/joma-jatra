import {
  ICreateDepositPayload,
  IDepositResponse,
  IDepositsQuery,
  IDepositsResponse,
  IReviewDepositPayload,
  ISoftDeleteResponse,
  IUpdateDepositPayload,
  IUploadProofResponse,
} from "@/types/global";
import baseApi from "../baseApi";

const depositsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getDeposits: builder.query<IDepositsResponse, IDepositsQuery | void>({
      query: (params) => ({
        url: "/deposits",
        params: params || undefined,
      }),
      providesTags: ["Deposits"],
    }),
    createDeposit: builder.mutation<IDepositResponse, ICreateDepositPayload>({
      query: (body) => ({
        url: "/deposits",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "Deposits",
        "Dashboard",
        "Members",
        "PaymentAccounts",
        "MonthlyTargets",
        "ActivityLogs",
        "User",
      ],
    }),
    updateDeposit: builder.mutation<IDepositResponse, IUpdateDepositPayload>({
      query: ({ id, ...body }) => ({
        url: `/deposits/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        "Deposits",
        "Dashboard",
        "Members",
        "PaymentAccounts",
        "MonthlyTargets",
        "ActivityLogs",
        "User",
      ],
    }),
    reviewDeposit: builder.mutation<IDepositResponse, IReviewDepositPayload>({
      query: ({ id, ...body }) => ({
        url: `/deposits/${id}/review`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        "Deposits",
        "Dashboard",
        "Members",
        "PaymentAccounts",
        "MonthlyTargets",
        "ActivityLogs",
        "User",
      ],
    }),
    deleteDeposit: builder.mutation<ISoftDeleteResponse, string>({
      query: (id) => ({
        url: `/deposits/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        "Deposits",
        "Dashboard",
        "Members",
        "PaymentAccounts",
        "MonthlyTargets",
        "ActivityLogs",
        "User",
      ],
    }),
    restoreDeposit: builder.mutation<IDepositResponse, string>({
      query: (id) => ({
        url: `/deposits/${id}/restore`,
        method: "PATCH",
      }),
      invalidatesTags: [
        "Deposits",
        "Dashboard",
        "Members",
        "PaymentAccounts",
        "MonthlyTargets",
        "ActivityLogs",
        "User",
      ],
    }),
    uploadProof: builder.mutation<IUploadProofResponse, FormData>({
      query: (formData) => ({
        url: "/upload",
        method: "POST",
        body: formData,
      }),
    }),
  }),
});

export const {
  useGetDepositsQuery,
  useCreateDepositMutation,
  useUpdateDepositMutation,
  useReviewDepositMutation,
  useDeleteDepositMutation,
  useRestoreDepositMutation,
  useUploadProofMutation,
} = depositsApi;
