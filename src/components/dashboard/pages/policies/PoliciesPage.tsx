"use client";

import PageHeader from "@/components/shared/PageHeader";
import {
  ArrowLeftRight,
  BookOpen,
  CheckCircle2,
  FileText,
  HandCoins,
  Landmark,
  Mail,
  Scale,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";

const SECTION_LINKS = [
  { id: "formula", label: "১. মূল হিসাবের সূত্র" },
  { id: "account-charge", label: "২. অ্যাকাউন্ট চার্জ (Pro-rata)" },
  { id: "transfer-fee", label: "৩. ট্রান্সফার ফি" },
  { id: "payout-fee", label: "৪. পেআউট ফি" },
  { id: "safety-rules", label: "৫. সুরক্ষা নিয়ম" },
  { id: "transparency", label: "৬. অডিট ও ইমেইল" },
];

/**
 * Group Policies, Charge Rules & Worked Bangla Examples Page (/dashboard/policies)
 * Read-only reference hub visible to all members for full financial clarity.
 */
export default function PoliciesPage() {
  return (
    <div className="space-y-5 max-w-5xl">
      <PageHeader
        title="Policies & Charge Rules"
        subtitle="গ্রুপ তহবিল, সব ধরনের চার্জ বণ্টন এবং স্বচ্ছ হিসাব নিকাশের পূর্ণ নীতিমালা — বাস্তব উদাহরণসহ"
        actions={
          <Link
            href="/dashboard/accounts"
            className="inline-flex items-center justify-center gap-1.5 h-9 min-h-9 px-3.5 rounded border border-[#b4cabe] bg-card text-foreground text-xs font-medium leading-none shadow-[0_1px_2px_rgba(7,42,31,0.05)] hover:bg-muted hover:border-[#8faea0] transition-colors cursor-pointer"
          >
            <Landmark className="w-3.5 h-3.5 text-primary" />
            Accounts &amp; Charges
          </Link>
        }
      />

      {/* Quick Section Navigation Strip */}
      <nav
        aria-label="Policy sections"
        className="bg-card border border-border rounded-md p-3 flex flex-wrap items-center gap-2"
      >
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1">
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          সূচিপত্র:
        </span>
        {SECTION_LINKS.map((sec) => (
          <a
            key={sec.id}
            href={`#${sec.id}`}
            className="px-2.5 py-1 rounded border border-border bg-muted/40 hover:bg-primary/10 hover:border-primary/30 hover:text-primary text-xs font-medium text-foreground transition-colors cursor-pointer"
          >
            {sec.label}
          </a>
        ))}
      </nav>

      {/* Section 1: Golden Ledger Formulas */}
      <section
        id="formula"
        className="bg-card border border-border rounded-md p-5 space-y-4 scroll-mt-4"
      >
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded border bg-[#e9f4ef] text-[#046c4e] border-[#cce3d8] flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              ১. মূল হিসাবের সূত্র (Golden Ledger Formula)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              গ্রুপের আসল ক্যাশ এবং সব মেম্বারের ব্যক্তিগত হিসাব সবসময় ৳০.০০ গরমিল
              ছাড়াই মিলে থাকে।
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="p-4 rounded border border-border bg-muted/35 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              মেম্বারের ব্যক্তিগত Net Balance
            </p>
            <p className="text-sm font-medium text-foreground leading-relaxed">
              মোট অনুমোদিত জমা (<span className="font-money">Deposited</span>) −
              মোট ফেরত ও দান (
              <span className="font-money">Returned + Waived</span>) − মোট চার্জ
              (<span className="font-money">Deducted Charges</span>)
            </p>
          </div>

          <div className="p-4 rounded border border-border bg-muted/35 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#285a84]">
              পুরো গ্রুপের ক্যাশ সমতা
            </p>
            <p className="text-sm font-medium text-foreground leading-relaxed">
              হাতে থাকা ক্যাশ (<span className="font-money">Cash in Hand</span>)
              = Active মেম্বারদের Net Balance + সাবেক বকেয়া (
              <span className="font-money">Unsettled Payable</span>) +{" "}
              <span className="font-money">Donated Reserve</span>
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Standalone Account Charge (Pro-Rata) */}
      <section
        id="account-charge"
        className="bg-card border border-border rounded-md p-5 space-y-4 scroll-mt-4"
      >
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded border bg-[#edf3f8] text-[#285a84] border-[#d2e0ed] flex items-center justify-center shrink-0">
            <Landmark className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              ২. গ্রুপের যৌথ অ্যাকাউন্ট চার্জ (Account Charge)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              যেমন: ব্যাংক মেইনটেন্যান্স ফি, SMS চার্জ বা অ্যাকাউন্ট সার্ভিস চার্জ
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          <div className="p-3.5 rounded border border-emerald-200/80 bg-emerald-50/45 space-y-1.5">
            <p className="font-semibold text-emerald-900">কারা বহন করে?</p>
            <p className="text-emerald-950/85 leading-relaxed">
              চার্জ রেকর্ড হওয়ার ঠিক ওই মুহূর্তে যেসব{" "}
              <strong>সক্রিয় (ACTIVE) মেম্বারের Net Balance &gt; ৳0</strong>,
              শুধু তাদের মধ্যে <strong>বর্তমান ব্যালেন্স অনুপাতে (Pro-rata)</strong>{" "}
              ভাগ হয়। ১ পয়সাও যেন এদিক-ওদিক না হয় সেজন্য ২-দশমিক{" "}
              <strong>Largest Remainder</strong> পদ্ধতিতে রাউন্ডিং হয়।
            </p>
          </div>

          <div className="p-3.5 rounded border border-border bg-muted/35 space-y-1.5">
            <p className="font-semibold text-foreground">কাদের থেকে কাটা হয় না?</p>
            <ul className="space-y-1 text-muted-foreground list-disc list-inside leading-relaxed">
              <li>নতুন জয়েন করা বা ৳০ ব্যালেন্স থাকা মেম্বার।</li>
              <li>
                <strong>সাবেক/ইনঅ্যাক্টিভ মেম্বারের বকেয়া পাওনা</strong> (তারা আগেই
                বের হয়েছে)।
              </li>
              <li>
                <strong>Donated / Waived Reserve</strong> (ভবিষ্যৎ গ্রুপ কাজের জন্য
                অক্ষত থাকে)।
              </li>
              <li>চার্জের পরে ভবিষ্যতে জয়েন করা কোনো নতুন মেম্বার।</li>
            </ul>
          </div>
        </div>

        {/* Worked Example Table */}
        <div className="border border-border rounded-md overflow-hidden">
          <div className="bg-muted/60 px-4 py-2.5 border-b border-border flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-foreground">
              বাস্তব উদাহরণ: ব্যাংক মেইনটেন্যান্স চার্জ ৳100.00
            </span>
            <span className="text-muted-foreground">
              সক্রিয় যোগ্য ব্যালেন্স: ৳2,000 + ৳1,000 = ৳3,000
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-2.5">সদস্য / খাত</th>
                  <th className="px-4 py-2.5">অবস্থা</th>
                  <th className="px-4 py-2.5 text-right">তৎকালীন ব্যালেন্স</th>
                  <th className="px-4 py-2.5 text-right">অংশ (%)</th>
                  <th className="px-4 py-2.5 text-right">কাটা চার্জ</th>
                  <th className="px-4 py-2.5 text-right">নতুন ব্যালেন্স</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    রহিম
                  </td>
                  <td className="px-4 py-2.5 text-emerald-700 font-medium">
                    Active
                  </td>
                  <td className="px-4 py-2.5 text-right font-money">৳2,000</td>
                  <td className="px-4 py-2.5 text-right font-money">66.67%</td>
                  <td className="px-4 py-2.5 text-right font-money font-semibold text-gold-dark">
                    -৳66.67
                  </td>
                  <td className="px-4 py-2.5 text-right font-money font-semibold text-primary">
                    ৳1,933.33
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    করিম
                  </td>
                  <td className="px-4 py-2.5 text-emerald-700 font-medium">
                    Active
                  </td>
                  <td className="px-4 py-2.5 text-right font-money">৳1,000</td>
                  <td className="px-4 py-2.5 text-right font-money">33.33%</td>
                  <td className="px-4 py-2.5 text-right font-money font-semibold text-gold-dark">
                    -৳33.33
                  </td>
                  <td className="px-4 py-2.5 text-right font-money font-semibold text-primary">
                    ৳966.67
                  </td>
                </tr>
                <tr className="bg-muted/20">
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    সাকিব (নতুন)
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground">Active</td>
                  <td className="px-4 py-2.5 text-right font-money">৳0</td>
                  <td className="px-4 py-2.5 text-right font-money">0.00%</td>
                  <td className="px-4 py-2.5 text-right font-money text-muted-foreground">
                    ৳0.00
                  </td>
                  <td className="px-4 py-2.5 text-right font-money">৳0</td>
                </tr>
                <tr className="bg-muted/20">
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    জামাল (বকেয়া)
                  </td>
                  <td className="px-4 py-2.5 text-gold-dark font-medium">
                    Former / Inactive
                  </td>
                  <td className="px-4 py-2.5 text-right font-money">৳500</td>
                  <td className="px-4 py-2.5 text-right font-money">সুরক্ষিত</td>
                  <td className="px-4 py-2.5 text-right font-money text-muted-foreground">
                    ৳0.00
                  </td>
                  <td className="px-4 py-2.5 text-right font-money">৳500</td>
                </tr>
                <tr className="bg-muted/20">
                  <td className="px-4 py-2.5 font-medium text-foreground">
                    Donated Reserve
                  </td>
                  <td className="px-4 py-2.5 text-[#1c6b72] font-medium">
                    গ্রুপ রিজার্ভ
                  </td>
                  <td className="px-4 py-2.5 text-right font-money">৳300</td>
                  <td className="px-4 py-2.5 text-right font-money">সুরক্ষিত</td>
                  <td className="px-4 py-2.5 text-right font-money text-muted-foreground">
                    ৳0.00
                  </td>
                  <td className="px-4 py-2.5 text-right font-money">৳300</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 3: Internal Transfer Fee */}
      <section
        id="transfer-fee"
        className="bg-card border border-border rounded-md p-5 space-y-4 scroll-mt-4"
      >
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded border bg-[#fcf4e6] text-[#a15c07] border-[#e8cfa0] flex items-center justify-center shrink-0">
            <ArrowLeftRight className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              ৩. অভ্যন্তরীণ ট্রান্সফার ফি (Internal Transfer Fee)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              এক অ্যাকাউন্ট থেকে আরেক অ্যাকাউন্টে টাকা সরানোর সময় ফি ৳০ হলে কোনো চার্জ
              কাটে না; ফি &gt; ৳০ হলে ২টি পরিষ্কার অপশন থাকে:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          <div className="p-4 rounded border border-border bg-muted/35 space-y-1.5">
            <p className="font-semibold text-foreground">
              ক) Group Shared (Pro-rata) [ডিফল্ট]
            </p>
            <p className="text-muted-foreground leading-relaxed">
              যখন গ্রুপের সাধারণ ফান্ড গোছানো বা Cash থেকে Bank-এ জমা দেওয়ার জন্য
              ট্রান্সফার করা হয় — তখন ফি সব Active মেম্বারদের ব্যালেন্স অনুপাতে
              ভাগ হয়।
            </p>
          </div>

          <div className="p-4 rounded border border-primary/30 bg-primary/5 space-y-1.5">
            <p className="font-semibold text-primary">
              খ) Specific Member (Payout / Settlement)
            </p>
            <p className="text-text-description leading-relaxed">
              যখন কোনো নির্দিষ্ট মেম্বারের Return বা Settle পরিশোধ করতে একক
              অ্যাকাউন্টে পর্যাপ্ত টাকা না থাকায় অন্য অ্যাকাউন্ট থেকে টাকা এনে দিতে
              হয় — তখন ওই ফি <strong>১০০% শুধু সেই মেম্বারের</strong> ব্যালেন্স
              থেকে কাটা যায়। অন্যদের ওপর ৳০.০০ চার্জ পড়ে।
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: Payout Fee */}
      <section
        id="payout-fee"
        className="bg-card border border-border rounded-md p-5 space-y-4 scroll-mt-4"
      >
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded border bg-[#eef1f8] text-[#3b5284] border-[#d4dced] flex items-center justify-center shrink-0">
            <HandCoins className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              ৪. রিটার্ন ও সেটেলমেন্ট পেআউট ফি (Payout Fee)
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              মেম্বারের হাতে/বিকাশে/ব্যাংকে চূড়ান্ত টাকা পাঠানোর সময় সেন্ড বা ক্যাশআউট
              চার্জ প্রাপক মেম্বার নিজে বহন করে।
            </p>
          </div>
        </div>

        <div className="p-4 rounded border border-border bg-muted/35 text-xs space-y-2.5">
          <p className="font-semibold text-foreground">
            বাস্তব ২-ধাপের উদাহরণ (Specific Transfer Fee + Final Payout Fee একসাথে):
          </p>
          <p className="text-text-description leading-relaxed">
            ধরুন <strong>আফিফের</strong> Net Balance ছিল{" "}
            <strong className="font-money text-foreground">৳1,000</strong>{" "}
            (গ্রুপের bKash-এ ৳600 ও Cash-এ ৳400 ভাগ হয়ে আছে):
          </p>
          <ol className="space-y-1.5 text-text-description list-decimal list-inside leading-relaxed">
            <li>
              <strong>ধাপ ১ (Internal Transfer):</strong> bKash থেকে Cash/Bank-এ
              টাকা একত্র করতে <strong>৳30</strong> ট্রান্সফার ফি হলো (
              <em>Specific Member = আফিফ</em>)। ফলে আফিফের ব্যালেন্স হবে{" "}
              <strong className="font-money text-foreground">
                ৳1,000 − ৳30 = ৳970
              </strong>
              ।
            </li>
            <li>
              <strong>ধাপ ২ (Return / Settle &amp; Close):</strong> এবার ওই বাকি{" "}
              <strong>৳970</strong> আফিফকে পাঠানোর সময় আরও{" "}
              <strong>৳15</strong> সেন্ড/ব্যাংক ফি (Payout Fee) হলে: মেম্বারের
              অ্যাকাউন্ট <strong className="font-money">৳970</strong> দিয়ে সম্পূর্ণ
              সেটেল (৳০) হবে, এবং আফিফের হাতে নিট পৌঁছাবে{" "}
              <strong className="font-money text-primary">
                ৳970 − ৳15 = ৳955
              </strong>
              ।
            </li>
          </ol>
        </div>
      </section>

      {/* Section 5: Safety & Fairness Rules */}
      <section
        id="safety-rules"
        className="bg-card border border-border rounded-md p-5 space-y-4 scroll-mt-4"
      >
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded border bg-[#e9f4ef] text-[#046c4e] border-[#cce3d8] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              ৫. সুরক্ষা ও জুলুম-মুক্ত বিশেষ নিয়মাবলি
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              কোনো পরিস্থিতিতেই যাতে কারো ব্যালেন্স মাইনাস না হয় বা অন্যায় চার্জ না
              পড়ে:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
          <div className="p-3.5 rounded border border-border bg-muted/30 space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              Active ব্যালেন্স না থাকলে চার্জ ব্লক
            </p>
            <p className="text-muted-foreground leading-relaxed">
              অ্যাকাউন্টে কেবল সাবেক মেম্বারের বকেয়া বা Donated রিজার্ভ থাকলেও
              যদি সক্রিয় মেম্বারদের মোট ব্যালেন্স চার্জের চেয়ে কম হয় (বা ৳০ হয়),
              সিস্টেম চার্জ ব্লক করবে — সাবেক/দানকৃত টাকায় হাত দেবে না।
            </p>
          </div>

          <div className="p-3.5 rounded border border-border bg-muted/30 space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              Pending Return থাকা অবস্থায় Deadlock-মুক্ত
            </p>
            <p className="text-muted-foreground leading-relaxed">
              ধরুন আফিফের ৳১,০০০ পেন্ডিং রিটার্ন রিকোয়েস্ট আছে, এর মধ্যে ৳৩০ চার্জ
              হলে চার্জ আটকাবে না — ব্যালেন্স হবে ৳৯৭০। পরে রিটার্ন অ্যাপ্রুভ
              করতে গেলে সিস্টেম ৳১,০০০ অ্যাপ্রুভ ব্লক করবে যাতে ৳৯৭০-এ এডিট/সমন্বয়
              করে পেমেন্ট হয়।
            </p>
          </div>

          <div className="p-3.5 rounded border border-border bg-muted/30 space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              Trash ও Restore নিরাপত্তা
            </p>
            <p className="text-muted-foreground leading-relaxed">
              ভুল চার্জ বা ট্রান্সফার ডিলিট করলে সবার চার্জ অটোমেটিক ফেরত আসে।
              পরে Restore করতে চাইলে সিস্টেম দেখে মেম্বাররা ইতোমধ্যে টাকা তুলে
              নিয়েছে বা গ্রুপ ছেড়েছে কি না — অসঙ্গতি হলে Restore ব্লক করে।
            </p>
          </div>

          <div className="p-3.5 rounded border border-border bg-muted/30 space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
              Approved ডিপোজিট সুরক্ষা
            </p>
            <p className="text-muted-foreground leading-relaxed">
              যে ডিপোজিটের টাকা থেকে ইতোমধ্যে চার্জ কাটা হয়েছে বা পেন্ডিং রিটার্ন
              রয়েছে, অ্যাডমিন সেই ডিপোজিট অনিরাপদভাবে কমাতে বা ডিলিট করতে পারবেন
              না।
            </p>
          </div>
        </div>
      </section>

      {/* Section 6: Audit Trail & Emails */}
      <section
        id="transparency"
        className="bg-card border border-border rounded-md p-5 space-y-4 scroll-mt-4"
      >
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded border bg-[#edf3f8] text-[#285a84] border-[#d2e0ed] flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              ৬. কোথায় কোথায় হিসাব ও প্রমাণ দেখতে পাবেন?
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              প্রতিটি মেম্বার নিজেই সব চার্জ, শতাংশ ও ব্যালেন্স যাচাই করতে পারেন:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <Link
            href="/dashboard/accounts"
            className="p-3.5 rounded border border-border bg-muted/25 hover:bg-muted/50 transition-colors cursor-pointer space-y-1"
          >
            <p className="font-semibold text-primary flex items-center gap-1.5">
              <Landmark className="w-3.5 h-3.5" />
              Accounts → Charges &amp; Transfers
            </p>
            <p className="text-muted-foreground">
              প্রতিটি চার্জ বা ট্রান্সফার ফির নিচে ক্লিক করে মেম্বার-ওয়াইজ স্ন্যাপশট ও
              % ব্রেকডাউন দেখুন।
            </p>
          </Link>

          <Link
            href="/dashboard/members"
            className="p-3.5 rounded border border-border bg-muted/25 hover:bg-muted/50 transition-colors cursor-pointer space-y-1"
          >
            <p className="font-semibold text-primary flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Member Audit Trail &amp; Export
            </p>
            <p className="text-muted-foreground">
              যেকোনো মেম্বারের প্রোফাইলে <em>Charges &amp; Fees</em> ফিল্টার ও
              Excel/PDF স্টেটমেন্ট ডাউনলোড করুন।
            </p>
          </Link>

          <div className="p-3.5 rounded border border-border bg-muted/25 space-y-1">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-primary" />
              স্বয়ংক্রিয় ইমেইল রিসিট
            </p>
            <p className="text-muted-foreground">
              চার্জ, ট্রান্সফার ফি বা পেআউট সম্পন্ন হওয়ার সাথে সাথেই বিস্তারিত
              রিসিট আপনার ইমেইলে পৌঁছে যায়।
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
