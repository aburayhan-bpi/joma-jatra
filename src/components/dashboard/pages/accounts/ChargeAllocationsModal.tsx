"use client";

import CustomModal from "@/components/shared/CustomModal";
import StatusPill from "@/components/shared/StatusPill";
import { IActorRef, IChargeAllocationItem } from "@/types/global";
import { formatDate } from "@/utils/formatDate";
import { formatTaka } from "@/utils/formatMoney";

export interface ChargeAllocationModalData {
  title: string;
  subtitle?: string;
  date: string;
  totalAmount: number;
  allocations: IChargeAllocationItem[];
}

interface ChargeAllocationsModalProps {
  data: ChargeAllocationModalData | null;
  onClose: () => void;
}

/**
 * Displays how an Account Charge or Transfer Fee was allocated across members.
 */
export default function ChargeAllocationsModal({
  data,
  onClose,
}: ChargeAllocationsModalProps) {
  const allocations = data?.allocations || [];

  return (
    <CustomModal
      isOpen={Boolean(data)}
      onClose={onClose}
      title={data?.title || "Charge Split Breakdown"}
      subtitle={data?.subtitle}
      className="max-w-xl"
    >
      {data && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded bg-muted/60 border border-border text-xs">
            <div>
              <span className="text-muted-foreground">Date: </span>
              <span className="font-medium text-foreground">
                {formatDate(data.date)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Total Fee: </span>
              <span className="font-semibold font-money text-gold-dark">
                {formatTaka(data.totalAmount)}
              </span>
            </div>
          </div>

          {allocations.length === 0 ? (
            <div className="p-4 rounded border border-border bg-muted/30 text-xs text-muted-foreground leading-relaxed">
              এই চার্জটি মেম্বার-ওয়াইজ চার্জ ভাগের সিস্টেম চালু হওয়ার আগে রেকর্ড
              করা হয়েছিল। তাই এটি গ্রুপের মোট তহবিল (Total Charges) থেকে বাদ
              গেছে, কিন্তু কোনো মেম্বারের ব্যক্তিগত ব্যালেন্স থেকে আলাদাভাবে
              কাটা হয়নি।
            </div>
          ) : (
            <div className="border border-border rounded-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                    <tr>
                      <th className="px-3.5 py-2.5">Member</th>
                      <th className="px-3.5 py-2.5 text-right">
                        Balance Snapshot
                      </th>
                      <th className="px-3.5 py-2.5 text-right">Share %</th>
                      <th className="px-3.5 py-2.5 text-right">Deducted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {allocations.map((alloc) => {
                      const member =
                        typeof alloc.memberId === "object"
                          ? (alloc.memberId as IActorRef)
                          : null;
                      return (
                        <tr key={alloc.id} className="hover:bg-muted/20">
                          <td className="px-3.5 py-2.5">
                            <p className="font-medium text-foreground">
                              {member?.name || "Member"}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <StatusPill
                                status={
                                  alloc.allocationMode === "DIRECT_MEMBER"
                                    ? "PENDING"
                                    : "APPROVED"
                                }
                                label={
                                  alloc.allocationMode === "DIRECT_MEMBER"
                                    ? "Direct Fee"
                                    : "Pro-rata"
                                }
                              />
                              {member?.status && member.status !== "ACTIVE" && (
                                <StatusPill status={member.status} />
                              )}
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-money text-muted-foreground">
                            {formatTaka(alloc.memberBalanceSnapshot)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-money text-foreground">
                            {alloc.sharePercent.toFixed(2)}%
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-semibold font-money text-gold-dark">
                            -{formatTaka(alloc.allocatedAmount)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </CustomModal>
  );
}
