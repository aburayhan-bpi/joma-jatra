import {
  IChangeMemberRolePayload,
  ICreateMemberPayload,
  IDeactivateMemberPayload,
  IDeactivateMemberResponse,
  IMemberAuditTrailQuery,
  IMemberAuditTrailResponse,
  IMemberResponse,
  IMembersQuery,
  IMembersResponse,
  IUpdateMemberPayload,
} from "@/types/global";
import baseApi from "../baseApi";

const membersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getMembers: builder.query<IMembersResponse, IMembersQuery | void>({
      query: (params) => ({
        url: "/members",
        params: params || undefined,
      }),
      providesTags: ["Members"],
    }),
    getMemberById: builder.query<IMemberResponse, string>({
      query: (id) => `/members/${id}`,
      providesTags: ["Members"],
    }),
    getMemberAuditTrail: builder.query<
      IMemberAuditTrailResponse,
      IMemberAuditTrailQuery
    >({
      query: ({ id, ...params }) => ({
        url: `/members/${id}/audit-trail`,
        params,
      }),
      providesTags: ["Members", "Deposits", "Returns", "ActivityLogs"],
    }),
    createMember: builder.mutation<IMemberResponse, ICreateMemberPayload>({
      query: (body) => ({
        url: "/members",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Members", "Dashboard", "ActivityLogs"],
    }),
    updateMember: builder.mutation<IMemberResponse, IUpdateMemberPayload>({
      query: ({ id, ...body }) => ({
        url: `/members/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Members", "Dashboard", "ActivityLogs"],
    }),
    changeMemberRole: builder.mutation<
      IMemberResponse,
      IChangeMemberRolePayload
    >({
      query: ({ id, role, previousAdminNextRole }) => ({
        url: `/members/${id}/role`,
        method: "PATCH",
        body: { role, previousAdminNextRole },
      }),
      invalidatesTags: ["Members", "User", "Dashboard", "ActivityLogs"],
    }),
    deactivateMember: builder.mutation<
      IDeactivateMemberResponse,
      IDeactivateMemberPayload
    >({
      query: ({ id, ...body }) => ({
        url: `/members/${id}/deactivate`,
        method: "POST",
        body,
      }),
      invalidatesTags: [
        "Members",
        "Returns",
        "PaymentAccounts",
        "Dashboard",
        "ActivityLogs",
      ],
    }),
    restoreMember: builder.mutation<IMemberResponse, string>({
      query: (id) => ({
        url: `/members/${id}/restore`,
        method: "PATCH",
      }),
      invalidatesTags: ["Members", "Dashboard", "ActivityLogs"],
    }),
  }),
});

export const {
  useGetMembersQuery,
  useGetMemberByIdQuery,
  useGetMemberAuditTrailQuery,
  useLazyGetMemberAuditTrailQuery,
  useCreateMemberMutation,
  useUpdateMemberMutation,
  useChangeMemberRoleMutation,
  useDeactivateMemberMutation,
  useRestoreMemberMutation,
} = membersApi;
