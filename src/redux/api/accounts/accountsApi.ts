import {
  IChargeResponse,
  IChargesQuery,
  IChargesResponse,
  ICreateChargePayload,
  ICreatePaymentAccountPayload,
  ICreateTransferPayload,
  IPaymentAccountResponse,
  IPaymentAccountsQuery,
  IPaymentAccountsResponse,
  ISoftDeleteResponse,
  ITransferResponse,
  ITransfersQuery,
  ITransfersResponse,
  IUpdatePaymentAccountPayload,
} from "@/types/global";
import baseApi from "../baseApi";

const accountsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Payment Accounts
    getPaymentAccounts: builder.query<
      IPaymentAccountsResponse,
      IPaymentAccountsQuery | void
    >({
      query: (params) => ({
        url: "/payment-accounts",
        params: params || undefined,
      }),
      providesTags: ["PaymentAccounts"],
    }),
    getPaymentAccountById: builder.query<IPaymentAccountResponse, string>({
      query: (id) => `/payment-accounts/${id}`,
      providesTags: ["PaymentAccounts"],
    }),
    createPaymentAccount: builder.mutation<
      IPaymentAccountResponse,
      ICreatePaymentAccountPayload
    >({
      query: (body) => ({
        url: "/payment-accounts",
        method: "POST",
        body,
      }),
      invalidatesTags: ["PaymentAccounts", "Dashboard", "ActivityLogs"],
    }),
    updatePaymentAccount: builder.mutation<
      IPaymentAccountResponse,
      IUpdatePaymentAccountPayload
    >({
      query: ({ id, ...body }) => ({
        url: `/payment-accounts/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [
        "PaymentAccounts",
        "Deposits",
        "Returns",
        "Transfers",
        "Charges",
        "Dashboard",
        "ActivityLogs",
      ],
    }),
    deletePaymentAccount: builder.mutation<ISoftDeleteResponse, string>({
      query: (id) => ({
        url: `/payment-accounts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        "PaymentAccounts",
        "Deposits",
        "Returns",
        "Transfers",
        "Charges",
        "Dashboard",
        "ActivityLogs",
      ],
    }),
    restorePaymentAccount: builder.mutation<IPaymentAccountResponse, string>({
      query: (id) => ({
        url: `/payment-accounts/${id}/restore`,
        method: "PATCH",
      }),
      invalidatesTags: [
        "PaymentAccounts",
        "Deposits",
        "Returns",
        "Transfers",
        "Charges",
        "Dashboard",
        "ActivityLogs",
      ],
    }),

    // Internal Transfers
    getTransfers: builder.query<ITransfersResponse, ITransfersQuery | void>({
      query: (params) => ({
        url: "/transfers",
        params: params || undefined,
      }),
      providesTags: ["Transfers"],
    }),
    createTransfer: builder.mutation<ITransferResponse, ICreateTransferPayload>(
      {
        query: (body) => ({
          url: "/transfers",
          method: "POST",
          body,
        }),
        invalidatesTags: [
          "Transfers",
          "PaymentAccounts",
          "Dashboard",
          "ActivityLogs",
        ],
      },
    ),
    deleteTransfer: builder.mutation<ISoftDeleteResponse, string>({
      query: (id) => ({
        url: `/transfers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        "Transfers",
        "PaymentAccounts",
        "Dashboard",
        "ActivityLogs",
      ],
    }),
    restoreTransfer: builder.mutation<ITransferResponse, string>({
      query: (id) => ({
        url: `/transfers/${id}/restore`,
        method: "PATCH",
      }),
      invalidatesTags: [
        "Transfers",
        "PaymentAccounts",
        "Dashboard",
        "ActivityLogs",
      ],
    }),

    // Standalone Account Charges
    getCharges: builder.query<IChargesResponse, IChargesQuery | void>({
      query: (params) => ({
        url: "/charges",
        params: params || undefined,
      }),
      providesTags: ["Charges"],
    }),
    createCharge: builder.mutation<IChargeResponse, ICreateChargePayload>({
      query: (body) => ({
        url: "/charges",
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "Charges",
        "PaymentAccounts",
        "Dashboard",
        "ActivityLogs",
      ],
    }),
    deleteCharge: builder.mutation<ISoftDeleteResponse, string>({
      query: (id) => ({
        url: `/charges/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        "Charges",
        "PaymentAccounts",
        "Dashboard",
        "ActivityLogs",
      ],
    }),
    restoreCharge: builder.mutation<IChargeResponse, string>({
      query: (id) => ({
        url: `/charges/${id}/restore`,
        method: "PATCH",
      }),
      invalidatesTags: [
        "Charges",
        "PaymentAccounts",
        "Dashboard",
        "ActivityLogs",
      ],
    }),
  }),
});

export const {
  useGetPaymentAccountsQuery,
  useGetPaymentAccountByIdQuery,
  useCreatePaymentAccountMutation,
  useUpdatePaymentAccountMutation,
  useDeletePaymentAccountMutation,
  useRestorePaymentAccountMutation,
  useGetTransfersQuery,
  useCreateTransferMutation,
  useDeleteTransferMutation,
  useRestoreTransferMutation,
  useGetChargesQuery,
  useCreateChargeMutation,
  useDeleteChargeMutation,
  useRestoreChargeMutation,
} = accountsApi;
