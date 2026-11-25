import {
  ActivityAction,
  ActivityEntity,
  EntrySource,
  MemberDeactivateAction,
  PaymentAccountType,
  PaymentMethodType,
  ReturnType,
  TransactionStatus,
  UserRole,
  UserStatus,
} from "@/types/backend";

/* ==========================================================================
   1. CORE BASE & SHARED TYPES
   ========================================================================== */

export interface IMeta {
  page: number;
  limit: number;
  total: number;
  totalPage: number;
}

export interface IBaseResponse<T = void> {
  success: boolean;
  statusCode: number;
  message: string;
  meta?: IMeta;
  data?: T;
}

export interface ChildrenProps {
  children: React.ReactNode;
}

export interface IListQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface IActorRef {
  _id?: string;
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  role: UserRole;
  status?: UserStatus;
  isDeleted?: boolean;
}

export interface IPaymentAccountRef {
  _id?: string;
  id?: string;
  accountName: string;
  accountNumber: string;
  method: PaymentMethodType;
}

export interface IMemberFinancialSummary {
  totalDeposited: number;
  totalReturned: number;
  totalDonatedWaived: number;
  netBalance: number;
  pendingDepositsCount: number;
  pendingReturnsCount: number;
}

export interface ISoftDeleteResult {
  id: string;
  isDeleted: boolean;
}

export type ISoftDeleteResponse = IBaseResponse<ISoftDeleteResult>;

/* ==========================================================================
   2. AUTHENTICATION & SELF PROFILE TYPES
   ========================================================================== */

export interface IAuthUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  role: UserRole;
  status: UserStatus;
  joinedAt?: string;
  mustChangePassword?: boolean;
  personalMonthlyGoal?: number;
}

export interface IUserProfile extends IAuthUser {
  financialSummary: IMemberFinancialSummary;
}

export interface IBootstrapAdminPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
}

export interface ILoginPayload {
  email: string;
  password: string;
}

export interface IAuthTokenPayload {
  accessToken: string;
  refreshToken: string;
  user: IAuthUser;
}

export type ILoginResponse = IBaseResponse<IAuthTokenPayload>;
export type IBootstrapAdminResponse = IBaseResponse<IAuthTokenPayload>;
export type IRefreshTokenResponse = IBaseResponse<IAuthTokenPayload>;
export type ILogoutPayload = void;
export type ILogoutResponse = IBaseResponse<null>;
export type IGetProfileResponse = IBaseResponse<IUserProfile>;

export interface IUpdateSelfProfilePayload {
  name?: string;
  phone?: string;
  profileImage?: string;
  personalMonthlyGoal?: number;
}

export type IUpdateSelfProfileResponse = IBaseResponse<IUserProfile>;

export interface IChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export type IChangePasswordResponse = IBaseResponse<{
  updated: boolean;
  accessToken?: string;
  refreshToken?: string;
}>;

export interface IForgotPasswordPayload {
  email: string;
}

export type IForgotPasswordResponse = IBaseResponse<{ sent: boolean }>;

export interface IResendOTPReqBody {
  email: string;
}

export type IResendOTPBaseResponse = IBaseResponse<{ sent: boolean }>;

export interface IVerifyOTPPayload {
  email: string;
  otp: string;
}

export type IVerifyOTPResponse = IBaseResponse<{ resetToken: string }>;

export interface IResetPasswordPayload {
  resetToken: string;
  newPassword: string;
}

export type IResetPasswordResponse = IBaseResponse<{ reset: boolean }>;

// Compatibility aliases used by legacy verify-signup page
export interface IRegisterPayload {
  name: string;
  email: string;
  password: string;
}
export type IRegisterResponse = IBaseResponse<{ email: string }>;

/* ==========================================================================
   3. MEMBERS & MEMBER AUDIT TRAIL TYPES
   ========================================================================== */

export interface IMember {
  _id?: string;
  id: string;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  role: UserRole;
  status: UserStatus;
  joinedAt: string;
  leftAt?: string | null;
  leaveNote?: string | null;
  mustChangePassword?: boolean;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdBy?: IActorRef | null;
  deletedBy?: IActorRef | null;
  financialSummary: IMemberFinancialSummary;
  unsettledPayable: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IMembersQuery extends IListQueryParams {
  status?: UserStatus | "";
  role?: UserRole | "";
  onlyDeleted?: boolean;
  includeDeleted?: boolean;
}

export interface ICreateMemberPayload {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role?: UserRole;
  joinedAt?: string;
  profileImage?: string;
  mustChangePassword?: boolean;
}

export interface IUpdateMemberPayload {
  id: string;
  name?: string;
  phone?: string;
  profileImage?: string;
  joinedAt?: string;
}

export interface IChangeMemberRolePayload {
  id: string;
  role: UserRole;
  previousAdminNextRole?: "CASHIER" | "MEMBER";
}

export interface IDeactivateMemberPayload {
  id: string;
  action: MemberDeactivateAction;
  leaveNote?: string;
  paymentAccountId?: string;
  paymentMethod?: PaymentMethodType;
  recipientAccount?: string;
  trxId?: string;
  proofImage?: string;
}

export type IMembersResponse = IBaseResponse<IMember[]>;
export type IMemberResponse = IBaseResponse<IMember>;
export type IDeactivateMemberResponse = IBaseResponse<{
  member: IMember;
  settlementReturn: IDepositReturn | null;
}>;

export interface IMemberAuditTrailEntry {
  id: string;
  eventCategory: "DEPOSIT" | "RETURN" | "LIFECYCLE";
  eventType: string;
  action: string;
  summary: string;
  date: string;
  month: string | null;
  amount: number | null;
  direction: "CREDIT" | "DEBIT" | "NEUTRAL";
  paymentMethod: string | null;
  paymentAccountName: string | null;
  trxId: string | null;
  status: string | null;
  entrySource: string | null;
  proofImage: string | null;
  note: string | null;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  } | null;
  performedBy: { id: string; name: string; role: string } | null;
  reviewedBy: { id: string; name: string; role: string } | null;
}

export interface IMemberAuditTrailQuery extends IListQueryParams {
  id: string;
  category?: "DEPOSIT" | "RETURN" | "LIFECYCLE" | "";
  status?: string;
  month?: string;
}

export type IMemberAuditTrailResponse = IBaseResponse<IMemberAuditTrailEntry[]>;

/* ==========================================================================
   4. PAYMENT ACCOUNTS TYPES
   ========================================================================== */

export interface IAccountBalanceBreakdown {
  accountId: string;
  totalInDeposits: number;
  totalOutReturns: number;
  totalTransferIn: number;
  totalTransferOut: number;
  totalTransferFees: number;
  totalStandaloneCharges: number;
  balance: number;
}

export interface IPaymentAccount {
  _id?: string;
  id: string;
  method: PaymentMethodType;
  accountName: string;
  accountNumber: string;
  accountType: PaymentAccountType;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
  note?: string;
  isActive: boolean;
  isDeleted: boolean;
  balance: number;
  balanceBreakdown?: IAccountBalanceBreakdown;
  createdBy?: IActorRef | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface IPaymentAccountsQuery extends IListQueryParams {
  method?: PaymentMethodType | "";
  isActive?: boolean;
  onlyDeleted?: boolean;
}

export interface ICreatePaymentAccountPayload {
  method: PaymentMethodType;
  accountName: string;
  accountNumber: string;
  accountType?: PaymentAccountType;
  bankName?: string;
  branchName?: string;
  routingNumber?: string;
  note?: string;
  isActive?: boolean;
}

export interface IUpdatePaymentAccountPayload
  extends Partial<ICreatePaymentAccountPayload> {
  id: string;
}

export type IPaymentAccountsResponse = IBaseResponse<IPaymentAccount[]>;
export type IPaymentAccountResponse = IBaseResponse<IPaymentAccount>;

/* ==========================================================================
   5. MONTHLY TARGETS TYPES
   ========================================================================== */

export interface IMonthlyTarget {
  id: string | null;
  month: string; // YYYY-MM
  hasTarget?: boolean;
  targetAmount: number;
  note?: string;
  collectedAmount: number;
  depositCount: number;
  remainingAmount: number;
  progressPercent: number;
  updatedBy?: IActorRef | null;
  updatedAt?: string | null;
}

export interface IUpsertMonthlyTargetPayload {
  month: string;
  targetAmount: number;
  note?: string;
}

export type IMonthlyTargetsResponse = IBaseResponse<IMonthlyTarget[]>;
export type IMonthlyTargetResponse = IBaseResponse<IMonthlyTarget>;

/* ==========================================================================
   6. DEPOSITS & PROOF UPLOAD TYPES
   ========================================================================== */

export interface IDeposit {
  _id?: string;
  id: string;
  memberId: IActorRef;
  amount: number;
  month: string;
  depositDate: string;
  paymentMethod: PaymentMethodType;
  paymentAccountId: IPaymentAccountRef;
  trxId?: string;
  proofImage?: string;
  note?: string;
  entrySource: EntrySource;
  status: TransactionStatus;
  rejectionReason?: string | null;
  createdBy?: IActorRef | null;
  reviewedBy?: IActorRef | null;
  reviewedAt?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IDepositsQuery extends IListQueryParams {
  memberId?: string;
  month?: string;
  status?: TransactionStatus | "";
  paymentMethod?: PaymentMethodType | "";
  paymentAccountId?: string;
  onlyDeleted?: boolean;
}

export interface ICreateDepositPayload {
  memberId?: string;
  amount: number;
  month?: string;
  depositDate?: string;
  paymentAccountId: string;
  paymentMethod?: PaymentMethodType;
  trxId?: string;
  proofImage?: string;
  note?: string;
}

export interface IUpdateDepositPayload {
  id: string;
  amount?: number;
  month?: string;
  depositDate?: string;
  paymentAccountId?: string;
  paymentMethod?: PaymentMethodType;
  trxId?: string;
  proofImage?: string;
  note?: string;
  editReason?: string;
}

export interface IReviewDepositPayload {
  id: string;
  status: "APPROVED" | "REJECTED";
  rejectionReason?: string;
}

export type IDepositsResponse = IBaseResponse<IDeposit[]>;
export type IDepositResponse = IBaseResponse<IDeposit>;

export interface IUploadProofData {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  bytes?: number;
}

export type IUploadProofResponse = IBaseResponse<IUploadProofData>;

/* ==========================================================================
   7. RETURNS & SETTLEMENTS TYPES
   ========================================================================== */

export interface IDepositReturn {
  _id?: string;
  id: string;
  memberId: IActorRef;
  amount: number;
  returnDate: string;
  paymentMethod?: PaymentMethodType | null;
  paymentAccountId?: IPaymentAccountRef | null;
  recipientAccount?: string;
  trxId?: string;
  proofImage?: string;
  reason?: string;
  returnType: ReturnType;
  entrySource: EntrySource;
  status: TransactionStatus;
  rejectionReason?: string | null;
  createdBy?: IActorRef | null;
  reviewedBy?: IActorRef | null;
  reviewedAt?: string | null;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IReturnsQuery extends IListQueryParams {
  memberId?: string;
  status?: TransactionStatus | "";
  returnType?: ReturnType | "";
  paymentMethod?: PaymentMethodType | "";
  onlyDeleted?: boolean;
}

export interface ICreateReturnPayload {
  memberId?: string;
  amount: number;
  returnDate?: string;
  paymentAccountId?: string;
  paymentMethod?: PaymentMethodType;
  recipientAccount?: string;
  trxId?: string;
  proofImage?: string;
  reason?: string;
  returnType?: ReturnType;
}

export interface IUpdateReturnPayload {
  id: string;
  amount?: number;
  recipientAccount?: string;
  reason?: string;
  paymentAccountId?: string;
  paymentMethod?: PaymentMethodType;
  trxId?: string;
  proofImage?: string;
}

export interface IReviewReturnPayload {
  id: string;
  status: "APPROVED" | "REJECTED";
  rejectionReason?: string;
  paymentAccountId?: string;
  paymentMethod?: PaymentMethodType;
  trxId?: string;
  proofImage?: string;
}

export type IReturnsResponse = IBaseResponse<IDepositReturn[]>;
export type IReturnResponse = IBaseResponse<IDepositReturn>;

/* ==========================================================================
   8. TRANSFERS, CHARGES, ACTIVITY LOGS & DASHBOARD TYPES
   ========================================================================== */

export interface IAccountTransfer {
  _id?: string;
  id: string;
  fromAccountId: IPaymentAccountRef;
  toAccountId: IPaymentAccountRef;
  amount: number;
  transferFee: number;
  transferDate: string;
  trxId?: string;
  proofImage?: string;
  note?: string;
  createdBy?: IActorRef | null;
  isDeleted: boolean;
  createdAt: string;
}

export interface ITransfersQuery extends IListQueryParams {
  accountId?: string;
  onlyDeleted?: boolean;
}

export interface ICreateTransferPayload {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  transferFee?: number;
  transferDate?: string;
  trxId?: string;
  proofImage?: string;
  note?: string;
}

export type ITransfersResponse = IBaseResponse<IAccountTransfer[]>;
export type ITransferResponse = IBaseResponse<IAccountTransfer>;

export interface IAccountCharge {
  _id?: string;
  id: string;
  paymentAccountId: IPaymentAccountRef;
  amount: number;
  chargeDate: string;
  title: string;
  proofImage?: string;
  note?: string;
  createdBy?: IActorRef | null;
  isDeleted: boolean;
  createdAt: string;
}

export interface IChargesQuery extends IListQueryParams {
  paymentAccountId?: string;
  onlyDeleted?: boolean;
}

export interface ICreateChargePayload {
  paymentAccountId: string;
  amount: number;
  title: string;
  chargeDate?: string;
  proofImage?: string;
  note?: string;
}

export type IChargesResponse = IBaseResponse<IAccountCharge[]>;
export type IChargeResponse = IBaseResponse<IAccountCharge>;

export interface IActivityLogItem {
  _id?: string;
  id: string;
  entityType: ActivityEntity;
  entityId?: string | null;
  targetMemberId?: IActorRef | null;
  action: ActivityAction;
  summary: string;
  amount?: number | null;
  proofImage?: string | null;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  } | null;
  performedBy?: IActorRef | null;
  createdAt: string;
}

export interface IActivityLogsQuery extends IListQueryParams {
  entityType?: ActivityEntity | "";
  action?: ActivityAction | "";
  targetMemberId?: string;
}

export type IActivityLogsResponse = IBaseResponse<IActivityLogItem[]>;

export interface IGroupFundSummary {
  totalApprovedDeposits: number;
  totalApprovedPayoutReturns: number;
  totalDonatedWaivers: number;
  totalTransferFees: number;
  totalStandaloneCharges: number;
  totalCharges: number;
  totalCashInHand: number;
  unsettledFormerMemberPayable: number;
  activeNetFund: number;
  accountBalancesSum: number;
  reconciliationDifference: number;
}

export interface IDashboardAccountBalance {
  id: string;
  method: PaymentMethodType;
  accountName: string;
  accountNumber: string;
  accountType: PaymentAccountType;
  isActive: boolean;
  balance: number;
}

export interface IDashboardSummary {
  fundSummary: IGroupFundSummary;
  currentMonth: IMonthlyTarget;
  accountBalances: IDashboardAccountBalance[];
  methodBalances: { method: PaymentMethodType; balance: number }[];
  counts: {
    activeMembersCount: number;
    inactiveMembersCount: number;
    pendingDepositsCount: number;
    pendingReturnsCount: number;
  };
  mySavings: IMemberFinancialSummary & {
    currentMonthDeposited: number;
    personalMonthlyGoal: number;
    personalGoalRemaining: number;
    personalGoalProgressPercent: number;
  };
  pendingQueue: {
    deposits: IDeposit[];
    returns: IDepositReturn[];
  } | null;
}

export type IDashboardSummaryResponse = IBaseResponse<IDashboardSummary>;

export interface IMonthlyMatrixMonth {
  month: string;
  hasTarget: boolean;
  targetAmount: number;
  collectedAmount: number;
  depositCount: number;
  progressPercent: number;
}

export interface IMonthlyMatrixRow {
  id: string;
  name: string;
  email: string;
  profileImage?: string;
  role: UserRole;
  status: UserStatus;
  isDeleted: boolean;
  joinedAt: string;
  totalDeposited: number;
  totalReturned: number;
  netBalance: number;
  monthlyBreakdown: Record<string, { amount: number; count: number } | null>;
}

export interface IMonthlyMatrixData {
  months: IMonthlyMatrixMonth[];
  rows: IMonthlyMatrixRow[];
}

export interface IMonthlyMatrixQuery {
  year?: string;
  includeInactive?: boolean;
}

export type IMonthlyMatrixResponse = IBaseResponse<IMonthlyMatrixData>;

export interface IResetTestDataPayload {
  confirmText: string;
  includeMembers?: boolean;
}

export interface IResetTestDataResult {
  deposits: number;
  returns: number;
  transfers: number;
  charges: number;
  monthlyTargets: number;
  paymentAccounts: number;
  activityLogs: number;
  members: number;
}

export type IResetTestDataResponse = IBaseResponse<IResetTestDataResult>;
