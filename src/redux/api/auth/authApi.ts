import {
  IBootstrapAdminPayload,
  IBootstrapAdminResponse,
  IChangePasswordPayload,
  IChangePasswordResponse,
  IForgotPasswordPayload,
  IForgotPasswordResponse,
  ILoginPayload,
  ILoginResponse,
  ILogoutPayload,
  ILogoutResponse,
  IRegisterPayload,
  IRegisterResponse,
  IResendOTPBaseResponse,
  IResendOTPReqBody,
  IResetPasswordPayload,
  IResetPasswordResponse,
  IVerifyOTPPayload,
  IVerifyOTPResponse,
} from "@/types/global";
import baseApi from "../baseApi";

const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    bootstrapAdmin: builder.mutation<
      IBootstrapAdminResponse,
      IBootstrapAdminPayload
    >({
      query: (body) => ({
        url: "/auth/bootstrap-admin",
        method: "POST",
        body,
      }),
    }),
    login: builder.mutation<ILoginResponse, ILoginPayload>({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: credentials,
      }),
    }),
    logout: builder.mutation<ILogoutResponse, ILogoutPayload>({
      query: () => ({
        url: "/auth/logout",
        method: "POST",
        body: {},
      }),
    }),
    changePassword: builder.mutation<
      IChangePasswordResponse,
      IChangePasswordPayload
    >({
      query: (body) => ({
        url: "/auth/change-password",
        method: "POST",
        body,
      }),
      invalidatesTags: ["User", "ActivityLogs"],
    }),
    forgotPassword: builder.mutation<
      IForgotPasswordResponse,
      IForgotPasswordPayload
    >({
      query: (body) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body,
      }),
    }),
    resendOtp: builder.mutation<IResendOTPBaseResponse, IResendOTPReqBody>({
      query: (body) => ({
        url: "/auth/resend-otp/forgot-password",
        method: "POST",
        body,
      }),
    }),
    verifyOtp: builder.mutation<IVerifyOTPResponse, IVerifyOTPPayload>({
      query: (body) => ({
        url: "/auth/verify-forgot-password-otp",
        method: "POST",
        body,
      }),
    }),
    resetPassword: builder.mutation<
      IResetPasswordResponse,
      IResetPasswordPayload
    >({
      query: ({ resetToken, newPassword }) => ({
        url: "/auth/reset-password",
        method: "POST",
        body: { resetToken, newPassword },
        headers: {
          Authorization: `Bearer ${resetToken}`,
        },
      }),
    }),
    // Legacy compatibility endpoints kept for existing verify-signup page
    signUp: builder.mutation<IRegisterResponse, IRegisterPayload>({
      query: (body) => ({
        url: "/auth/signup",
        method: "POST",
        body,
      }),
    }),
    verifySignupOtp: builder.mutation<
      ILoginResponse,
      { email: string; otp: string }
    >({
      query: (body) => ({
        url: "/auth/verify-otp",
        method: "POST",
        body,
      }),
    }),
    resendSignupOtp: builder.mutation<
      IResendOTPBaseResponse,
      { email: string }
    >({
      query: (body) => ({
        url: "/auth/resend-otp/signup",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useBootstrapAdminMutation,
  useLoginMutation,
  useLogoutMutation,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useResendOtpMutation,
  useVerifyOtpMutation,
  useSignUpMutation,
  useVerifySignupOtpMutation,
  useResendSignupOtpMutation,
} = authApi;
