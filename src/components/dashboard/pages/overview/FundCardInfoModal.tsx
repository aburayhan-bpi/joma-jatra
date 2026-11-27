"use client";

import CustomModal from "@/components/shared/CustomModal";
import { IGroupFundSummary, IMonthlyTarget } from "@/types/global";
import { formatMonthLabel, formatTaka } from "@/utils/formatMoney";
import Link from "next/link";

export type OverviewInfoCardKey =
  | "cash"
  | "activeFund"
  | "formerPayable"
  | "monthTarget";

interface FundCardInfoModalProps {
  cardKey: OverviewInfoCardKey | null;
  onClose: () => void;
  fundSummary: IGroupFundSummary;
  currentMonth: IMonthlyTarget;
  inactiveMembersCount: number;
  accountBalancesCount: number;
}

interface BreakdownRow {
  label: string;
  value: string;
  tone?: "positive" | "negative" | "neutral" | "total";
}

/**
 * Bangla explanation modal with live calculation breakdown for each Overview KPI card.
 * Uses CustomModal for cross-device Y-axis scrolling support.
 */
export default function FundCardInfoModal({
  cardKey,
  onClose,
  fundSummary,
  currentMonth,
  inactiveMembersCount,
  accountBalancesCount,
}: FundCardInfoModalProps) {
  const monthLabel = formatMonthLabel(currentMonth.month);

  const getContent = (): {
    title: string;
    subtitle: string;
    summaryBangla: string;
    points: string[];
    rows: BreakdownRow[];
    footerLink?: { href: string; label: string };
  } | null => {
    if (!cardKey) return null;

    if (cardKey === "cash") {
      return {
        title: "Total Cash in Hand — হিসাব কীভাবে হয়?",
        subtitle: "গ্রুপের সব অ্যাকাউন্টে হাতে থাকা মোট আসল টাকা",
        summaryBangla:
          "এই মুহূর্তে গ্রুপের সব পেমেন্ট অ্যাকাউন্ট (Cash, bKash, Nagad, Bank ইত্যাদি) মিলিয়ে মোট যত টাকা আসল ক্যাশ হিসেবে হাতে জমা আছে, এটাই সেই পরিমাণ।",
        points: [
          "মেম্বারদের অনুমোদিত সব জমা (Approved Deposits) এখানে যোগ থাকে।",
          "যেসব টাকা রিটার্ন দেওয়া হয়েছে (Cash/Bank Payout) এবং ব্যাংক বা ট্রান্সফার চার্জ বাদ যায়।",
          "কেউ টাকা দান বা মাফ (Donated / Waived) করলে সেই টাকা অ্যাকাউন্টেই থেকে যায়, তাই তা এখানেই অন্তর্ভুক্ত থাকে।",
        ],
        rows: [
          {
            label: "মোট অনুমোদিত জমা (Approved Deposits)",
            value: `+ ${formatTaka(fundSummary.totalApprovedDeposits)}`,
            tone: "positive",
          },
          {
            label: "মেম্বারদের ফেরত দেওয়া হয়েছে (Payout Returns)",
            value: `- ${formatTaka(fundSummary.totalApprovedPayoutReturns)}`,
            tone: "negative",
          },
          {
            label: "মোট চার্জ (Transfer Fee + Account Charge)",
            value: `- ${formatTaka(fundSummary.totalCharges)}`,
            tone: "negative",
          },
          {
            label: `হাতে থাকা মোট টাকা (${accountBalancesCount}টি অ্যাকাউন্ট)`,
            value: formatTaka(fundSummary.totalCashInHand),
            tone: "total",
          },
        ],
        footerLink: {
          href: "/dashboard/accounts",
          label: "সব অ্যাকাউন্ট ও চার্জ দেখুন →",
        },
      };
    }

    if (cardKey === "activeFund") {
      return {
        title: "Active Net Fund — হিসাব কীভাবে হয়?",
        subtitle: "বকেয়া বাদ দিয়ে সক্রিয় গ্রুপ তহবিলের নিট পরিমাণ",
        summaryBangla:
          "হাতে থাকা মোট টাকা (Total Cash in Hand) থেকে কোনো প্রাক্তন মেম্বারের বকেয়া পাওনা থাকলে তা আলাদা করে বাদ দেওয়ার পর, বর্তমানে সক্রিয় গ্রুপের জন্য নিট যত টাকা থাকে সেটাই Active Net Fund।",
        points: [
          "কোনো প্রাক্তন মেম্বারের পাওনা বাকি থাকলে সেটা আগেই বাদ রাখা হয় যাতে ভুল করে খরচ না হয়।",
          "গ্রুপের যৌথ চার্জ (ব্যাংক SMS বা অ্যাকাউন্ট ট্রান্সফার ফি) আলাদাভাবে গ্রুপ খরচ (Total Charges) হিসেবে মোট তহবিল থেকে বাদ যায় — সদস্যদের ব্যক্তিগত জমার ব্যালেন্স অটোমেটিক কমানো হয় না।",
          "কেউ টাকা দান বা মাফ (Donated / Waived) করলে তা সম্পূর্ণ আলাদা গ্রুপ রিজার্ভ হিসেবে এখানে যুক্ত থাকে এবং অন্যান্য মেম্বারের ব্যক্তিগত ব্যালেন্সে ভাগ হয় না।",
        ],
        rows: [
          {
            label: "হাতে থাকা মোট টাকা (Total Cash in Hand)",
            value: formatTaka(fundSummary.totalCashInHand),
            tone: "neutral",
          },
          {
            label: "সাবেক মেম্বারদের বকেয়া পাওনা (Unsettled Payable)",
            value: `- ${formatTaka(fundSummary.unsettledFormerMemberPayable)}`,
            tone: "negative",
          },
          {
            label: "বর্তমান Active Net Fund",
            value: formatTaka(fundSummary.activeNetFund),
            tone: "total",
          },
          {
            label: "এর ভেতর Donated / Waived রিজার্ভ",
            value: formatTaka(fundSummary.totalDonatedWaivers),
            tone: "positive",
          },
          {
            label: "মোট বাদ যাওয়া চার্জ (Transfer + Account)",
            value: `${formatTaka(fundSummary.totalCharges)} (${formatTaka(fundSummary.totalTransferFees)} + ${formatTaka(fundSummary.totalStandaloneCharges)})`,
            tone: "neutral",
          },
        ],
        footerLink: {
          href: "/dashboard/returns?returnType=DONATED_WAIVER",
          label: "সব দান / ওয়েভার রেকর্ড দেখুন →",
        },
      };
    }

    if (cardKey === "formerPayable") {
      return {
        title: "Unsettled Former Payable — এটা কী?",
        subtitle: "গ্রুপ ছেড়ে যাওয়া মেম্বারদের বকেয়া পাওনা",
        summaryBangla:
          "কোনো মেম্বারকে ডিঅ্যাক্টিভেট বা গ্রুপ থেকে ক্লোজ করার সময় যদি সাথে সাথে তার টাকা পরিশোধ না করে 'পরে সেটেল করা হবে' অপশন বেছে নেওয়া হয়, তবে সেই অপরিশোধিত পাওনা টাকাটাই এখানে জমা থাকে।",
        points: [
          "এই টাকা এখনো গ্রুপের পেমেন্ট অ্যাকাউন্টেই আছে, কিন্তু তা সক্রিয় মেম্বারদের ফান্ড না — ভবিষ্যতে প্রাক্তন মেম্বারকে ফেরত দিতে হবে।",
          "টাকা ফেরত বা ডোনেট/ওয়েভ করে সেটেল করে দিলেই এই সংখ্যা ৳ 0 হয়ে যাবে।",
          `বর্তমানে মোট ${inactiveMembersCount} জন ইনঅ্যাক্টিভ/সাবেক মেম্বার আছেন।`,
        ],
        rows: [
          {
            label: "মোট বকেয়া পরিশোধযোগ্য (Payable)",
            value: formatTaka(fundSummary.unsettledFormerMemberPayable),
            tone:
              fundSummary.unsettledFormerMemberPayable > 0
                ? "negative"
                : "total",
          },
          {
            label: "ইনঅ্যাক্টিভ / সাবেক মেম্বার সংখ্যা",
            value: `${inactiveMembersCount} জন`,
            tone: "neutral",
          },
        ],
        footerLink: {
          href: "/dashboard/members?tab=former",
          label: "সাবেক মেম্বারদের তালিকা দেখুন →",
        },
      };
    }

    return {
      title: `${monthLabel} Target — হিসাব কীভাবে হয়?`,
      subtitle: "চলতি মাসের গ্রুপ জমার লক্ষ্য ও অগ্রগতি",
      summaryBangla: `${monthLabel} মাসে গ্রুপের সব মেম্বার মিলে এখন পর্যন্ত মোট যত টাকা জমা (Approved Deposit) দিয়েছেন এবং এই মাসের নির্ধারিত গ্রুপ টার্গেটের কত শতাংশ পূর্ণ হয়েছে, তা এখানে দেখায়।`,
      points: [
        "এখানে শুধু ওই মাসের অনুমোদিত ডিপোজিট (Approved Deposits) গণনা করা হয়; পেন্ডিং রিকোয়েস্ট যোগ হয় না।",
        "চলতি মাসে কোনো মেম্বার টাকা জমা দিয়ে পরে চলে গেলেও ওই মাসে জমা হওয়া আসল টাকা হিসাব থেকে বাদ পড়ে না।",
        "অ্যাডমিন বা ক্যাশিয়ার Monthly Sheet পেজ থেকে যেকোনো মাসের গ্রুপ টার্গেট সেট বা পরিবর্তন করতে পারেন।",
      ],
      rows: [
        {
          label: `${monthLabel} মাসে মোট জমা`,
          value: `${formatTaka(currentMonth.collectedAmount)} (${currentMonth.depositCount}টি ডিপোজিট)`,
          tone: "positive",
        },
        {
          label: "নির্ধারিত মাসিক টার্গেট",
          value:
            currentMonth.targetAmount > 0
              ? formatTaka(currentMonth.targetAmount)
              : "এখনো সেট করা হয়নি",
          tone: "neutral",
        },
        {
          label: "লক্ষ্য অর্জনের হার",
          value: `${currentMonth.progressPercent}%`,
          tone: "total",
        },
      ],
      footerLink: {
        href: "/dashboard/monthly-sheet",
        label: "পুরো Monthly Sheet দেখুন →",
      },
    };
  };

  const info = getContent();

  return (
    <CustomModal
      isOpen={Boolean(info)}
      onClose={onClose}
      title={info?.title || "Fund Card Info"}
      subtitle={info?.subtitle}
      className="max-w-lg"
    >
      {info && (
        <div className="space-y-4">
          {/* Plain Bangla Summary */}
          <div className="rounded-md border border-[#cce3d8] bg-[#e9f4ef]/60 p-3.5 text-xs sm:text-[13px] leading-relaxed text-foreground">
            {info.summaryBangla}
          </div>

          {/* Key Rules */}
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-foreground">
              মূল নিয়ম ও তথ্য:
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed list-disc pl-4">
              {info.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </div>

          {/* Live Calculation Breakdown */}
          <div className="border border-border rounded-md overflow-hidden divide-y divide-border">
            {info.rows.map((row) => (
              <div
                key={row.label}
                className={`px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs ${
                  row.tone === "total" ? "bg-muted/60 font-semibold" : "bg-card"
                }`}
              >
                <span
                  className={
                    row.tone === "total"
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  {row.label}
                </span>
                <span
                  className={`font-money whitespace-nowrap ${
                    row.tone === "positive" || row.tone === "total"
                      ? "text-primary font-semibold"
                      : row.tone === "negative"
                        ? "text-gold-dark font-medium"
                        : "text-foreground"
                  }`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          {/* Footer Action */}
          {info.footerLink && (
            <div className="flex justify-end pt-1">
              <Link
                href={info.footerLink.href}
                onClick={onClose}
                className="text-xs font-medium text-primary hover:text-brand-dark hover:underline cursor-pointer"
              >
                {info.footerLink.label}
              </Link>
            </div>
          )}
        </div>
      )}
    </CustomModal>
  );
}
