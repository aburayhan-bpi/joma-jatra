"use client";

import CustomModal from "@/components/shared/CustomModal";
import InlineLoader from "@/components/shared/InlineLoader";
import { useGetPaymentAccountByIdQuery } from "@/redux/api/accounts/accountsApi";
import { formatTaka, getPaymentMethodLabel } from "@/utils/formatMoney";

interface AccountBreakdownModalProps {
  accountId: string | null;
  onClose: () => void;
}

/**
 * Displays exact live reconciliation breakdown for a single Payment Account:
 * Deposits In - Returns Out + Transfers In - Transfers Out - Transfer Fees - Charges = Balance
 */
export default function AccountBreakdownModal({
  accountId,
  onClose,
}: AccountBreakdownModalProps) {
  const { data: accountRes, isLoading } = useGetPaymentAccountByIdQuery(
    accountId || "",
    { skip: !accountId },
  );

  const account = accountRes?.data;
  const breakdown = account?.balanceBreakdown;

  return (
    <CustomModal
      isOpen={Boolean(accountId)}
      onClose={onClose}
      title={account?.accountName || "Account Balance Breakdown"}
      subtitle={
        account
          ? `${getPaymentMethodLabel(account.method)} • ${account.accountNumber}`
          : "Live ledger reconciliation"
      }
      className="max-w-md"
    >
      {isLoading ? (
        <InlineLoader text="Calculating account reconciliation..." />
      ) : !account || !breakdown ? (
        <p className="text-xs text-muted-foreground">
          Unable to load account breakdown.
        </p>
      ) : (
        <div className="space-y-3 text-sm">
          <div className="divide-y divide-border border border-border rounded-md bg-background/50">
            <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
              <span className="text-muted-foreground">Approved Deposits In</span>
              <span className="font-semibold font-money text-primary">
                + {formatTaka(breakdown.totalInDeposits)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
              <span className="text-muted-foreground">
                Internal Transfers In
              </span>
              <span className="font-semibold font-money text-primary">
                + {formatTaka(breakdown.totalTransferIn)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
              <span className="text-muted-foreground">
                Approved Returns Out
              </span>
              <span className="font-semibold font-money text-gold-dark">
                - {formatTaka(breakdown.totalOutReturns)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
              <span className="text-muted-foreground">
                Internal Transfers Out
              </span>
              <span className="font-semibold font-money text-gold-dark">
                - {formatTaka(breakdown.totalTransferOut)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
              <span className="text-muted-foreground">Transfer / Cash-Out Fees</span>
              <span className="font-semibold font-money text-gold-dark">
                - {formatTaka(breakdown.totalTransferFees)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-2.5 text-xs">
              <span className="text-muted-foreground">
                Standalone Account Charges
              </span>
              <span className="font-semibold font-money text-gold-dark">
                - {formatTaka(breakdown.totalStandaloneCharges)}
              </span>
            </div>
            <div className="flex items-center justify-between px-3.5 py-3 bg-muted/60 text-sm">
              <span className="font-semibold text-foreground">
                Live Account Balance
              </span>
              <span className="font-bold font-money text-primary">
                {formatTaka(breakdown.balance)}
              </span>
            </div>
          </div>

          {account.bankName && (
            <div className="text-xs text-muted-foreground bg-muted/40 border border-border rounded px-3 py-2">
              <strong className="text-foreground">Bank: </strong>
              {account.bankName}
              {account.branchName ? ` • Branch: ${account.branchName}` : ""}
              {account.routingNumber
                ? ` • Routing: ${account.routingNumber}`
                : ""}
            </div>
          )}
        </div>
      )}
    </CustomModal>
  );
}
