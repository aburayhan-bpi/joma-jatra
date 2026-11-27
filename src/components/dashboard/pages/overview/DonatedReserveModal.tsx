"use client";

import CustomModal from "@/components/shared/CustomModal";
import InlineLoader from "@/components/shared/InlineLoader";
import StatusPill from "@/components/shared/StatusPill";
import { useGetReturnsQuery } from "@/redux/api/returns/returnsApi";
import { formatDate } from "@/utils/formatDate";
import { formatTaka } from "@/utils/formatMoney";
import { ArrowRight, HeartHandshake } from "lucide-react";
import Link from "next/link";

interface DonatedReserveModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalDonatedWaivers: number;
}

/**
 * Audit trail modal for the group's Donated / Waived Reserve.
 * Shows live reserve balance alongside all approved donation/waiver contributions.
 */
export default function DonatedReserveModal({
  isOpen,
  onClose,
  totalDonatedWaivers,
}: DonatedReserveModalProps) {
  const { data: donationsRes, isLoading } = useGetReturnsQuery(
    {
      returnType: "DONATED_WAIVER",
      status: "APPROVED",
      page: 1,
      limit: 100,
    },
    { skip: !isOpen },
  );

  const donations = donationsRes?.data || [];
  const totalCount = donationsRes?.meta?.total ?? donations.length;

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Donated / Waived Reserve — Audit Trail"
      subtitle="Protected group reserve contributed voluntarily by members (untouched by charges)"
      className="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Top Reserve Balance Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded border border-border bg-muted/40">
            <p className="text-[11px] font-medium text-muted-foreground">
              Total Donated Inflow
            </p>
            <p className="text-base font-semibold font-money text-foreground mt-0.5">
              {formatTaka(totalDonatedWaivers)}
            </p>
          </div>
          <div className="p-3 rounded border border-border bg-muted/40">
            <p className="text-[11px] font-medium text-muted-foreground">
              Spent from Reserve
            </p>
            <p className="text-base font-semibold font-money text-muted-foreground mt-0.5">
              ৳ 0
            </p>
          </div>
          <div className="p-3 rounded border border-[#cce3d8] bg-[#e9f4ef]">
            <p className="text-[11px] font-medium text-[#046c4e]">
              Available Reserve Balance
            </p>
            <p className="text-base font-bold font-money text-[#046c4e] mt-0.5">
              {formatTaka(totalDonatedWaivers)}
            </p>
          </div>
        </div>

        {/* Audit Table */}
        {isLoading ? (
          <InlineLoader text="Loading donated reserve records..." />
        ) : donations.length === 0 ? (
          <div className="p-6 rounded border border-border bg-muted/25 text-center space-y-1.5">
            <HeartHandshake className="w-6 h-6 text-muted-foreground mx-auto" />
            <p className="text-xs font-medium text-foreground">
              No donated or waived contributions yet
            </p>
            <p className="text-[11px] text-muted-foreground">
              Approved balance waivers and Donate &amp; Close entries will appear
              here with full audit details.
            </p>
          </div>
        ) : (
          <div className="border border-border rounded-md overflow-hidden">
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border sticky top-0">
                  <tr>
                    <th className="px-3.5 py-2.5">Date</th>
                    <th className="px-3.5 py-2.5">Member</th>
                    <th className="px-3.5 py-2.5">Reason / Note</th>
                    <th className="px-3.5 py-2.5">Approved By</th>
                    <th className="px-3.5 py-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {donations.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/25">
                      <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">
                        {formatDate(item.returnDate)}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {item.memberId?.id || item.memberId?._id ? (
                          <Link
                            href={`/dashboard/members/${item.memberId.id || item.memberId._id}`}
                            onClick={onClose}
                            className="font-medium text-foreground hover:text-primary hover:underline cursor-pointer"
                            title={item.memberId.name}
                          >
                            {item.memberId.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-foreground">
                            Member
                          </span>
                        )}
                        <div className="mt-0.5">
                          <StatusPill
                            status={item.status}
                            label={
                              item.memberId?.status &&
                              item.memberId.status !== "ACTIVE"
                                ? "Former Member"
                                : "Waiver"
                            }
                          />
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-muted-foreground max-w-52">
                        <p
                          className="truncate"
                          title={item.reason || "Balance donated to group fund"}
                        >
                          {item.reason || "Balance donated to group fund"}
                        </p>
                      </td>
                      <td className="px-3.5 py-2.5 text-muted-foreground whitespace-nowrap">
                        {item.reviewedBy?.name || item.createdBy?.name || "—"}
                      </td>
                      <td className="px-3.5 py-2.5 text-right font-semibold font-money text-[#046c4e] whitespace-nowrap">
                        +{formatTaka(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Action */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border text-xs">
          <span className="text-muted-foreground">
            Showing {donations.length} of {totalCount} donation record(s)
          </span>
          <Link
            href="/dashboard/returns?returnType=DONATED_WAIVER"
            onClick={onClose}
            className="inline-flex items-center gap-1 font-medium text-primary hover:text-brand-dark cursor-pointer"
          >
            Open full Returns filter
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </CustomModal>
  );
}
