"use client";

import { useUploadProofMutation } from "@/redux/api/deposits/depositsApi";
import { getApiErrorMessage } from "@/utils/formatMoney";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import { toast } from "sonner";

interface ProofUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
}

/**
 * Simple proof image uploader connected to POST /api/v1/upload (Cloudinary).
 */
export default function ProofUploadField({
  value,
  onChange,
  label = "Proof Screenshot (Optional)",
  folder = "joma-jatra/proofs",
}: ProofUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProof, { isLoading }] = useUploadProofMutation();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    try {
      const res = await uploadProof(formData).unwrap();
      if (res.data?.url) {
        onChange(res.data.url);
        toast.success("Proof image uploaded");
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to upload proof image"));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-text-description">
        {label}
      </label>

      {value ? (
        <div className="flex items-center gap-3 p-2.5 rounded-md border border-border bg-background">
          <div className="relative w-14 h-14 rounded overflow-hidden border border-border shrink-0 bg-card">
            <Image
              src={value}
              alt="Uploaded proof"
              fill
              sizes="56px"
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">
              Proof attached
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {value}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange("")}
            className="p-1.5 rounded text-muted-foreground hover:text-error hover:bg-error-5 transition-colors cursor-pointer"
            aria-label="Remove proof image"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={isLoading}
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 h-11 px-3 rounded border border-dashed border-input bg-background hover:bg-muted/50 hover:border-primary/50 text-xs font-medium text-muted-foreground transition-colors cursor-pointer disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Uploading screenshot...
            </>
          ) : (
            <>
              <ImagePlus className="w-4 h-4 text-primary" />
              Click to upload screenshot (JPG, PNG, WEBP — max 5MB)
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
