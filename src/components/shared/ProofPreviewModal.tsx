"use client";

import CustomModal from "@/components/shared/CustomModal";
import { formatDateTime } from "@/utils/formatDate";
import { formatTaka, getPaymentMethodLabel } from "@/utils/formatMoney";
import { ExternalLink } from "lucide-react";
import Image from "next/image";

export interface ProofPreviewData {
  title: string;
  imageUrl: string;
  amount?: number | null;
  method?: string | null;
  trxId?: string | null;
  date?: string | null;
  note?: string | null;
}

interface ProofPreviewModalProps {
  proof: ProofPreviewData | null;
  onClose: () => void;
}

/**
 * Reusable modal for inspecting uploaded deposit, return, transfer, or charge proof screenshots.
 */
export default function ProofPreviewModal({
  proof,
  onClose,
}: ProofPreviewModalProps) {
  return (
    <CustomModal
      isOpen={Boolean(proof)}
      onClose={onClose}
      title={proof?.title || "Payment Proof"}
      subtitle={proof?.date ? formatDateTime(proof.date) : undefined}
      className="max-w-xl"
    >
      {proof && (
        <div className="space-y-4">
          {/* Quick transaction metadata strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-md bg-muted/60 border border-border text-xs">
            {proof.amount !== undefined && proof.amount !== null && (
              <div>
                <p className="text-muted-foreground">Amount</p>
                <p className="font-semibold text-foreground font-money mt-0.5">
                  {formatTaka(proof.amount)}
                </p>
              </div>
            )}
            {proof.method && (
              <div>
                <p className="text-muted-foreground">Method</p>
                <p className="font-semibold text-foreground mt-0.5">
                  {getPaymentMethodLabel(proof.method)}
                </p>
              </div>
            )}
            {proof.trxId && (
              <div>
                <p className="text-muted-foreground">TrxID</p>
                <p className="font-mono font-semibold text-foreground mt-0.5 break-all">
                  {proof.trxId}
                </p>
              </div>
            )}
          </div>

          {/* Screenshot viewer using Next.js optimized Image */}
          <div className="relative w-full h-64 sm:h-96 rounded-md border border-border bg-background overflow-hidden">
            <Image
              src={proof.imageUrl}
              alt={proof.title}
              fill
              sizes="(max-width: 768px) 95vw, 560px"
              className="object-contain p-2"
            />
          </div>

          {proof.note && (
            <p className="text-xs text-muted-foreground bg-background border border-border rounded px-3 py-2">
              <span className="font-medium text-foreground">Note: </span>
              {proof.note}
            </p>
          )}

          {/* Open original image in new tab */}
          <div className="flex justify-end">
            <a
              href={proof.imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-brand-dark cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open Full Size
            </a>
          </div>
        </div>
      )}
    </CustomModal>
  );
}
