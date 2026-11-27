import CustomButton from "@/components/shared/CustomButton";

const CancelSubmitButton = ({
  handleCancel,
  loading = false,
  disabled = false,
  submitText = "Confirm",
  cancelText = "Cancel",
}: {
  handleCancel: () => void;
  loading?: boolean;
  disabled?: boolean;
  submitText?: string;
  cancelText?: string;
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-end pt-3 border-t border-border">
      <CustomButton
        className="w-full sm:w-auto px-5 border-border bg-card text-foreground hover:bg-muted cursor-pointer transition-colors shadow-none"
        variant="outline"
        btnText={cancelText}
        type="button"
        onClick={handleCancel}
        disabled={loading}
      />

      <CustomButton
        type="submit"
        btnText={submitText}
        className="w-full sm:w-auto px-6 bg-primary text-primary-foreground hover:bg-brand-dark cursor-pointer transition-colors"
        loading={loading}
        disabled={disabled}
      />
    </div>
  );
};

export default CancelSubmitButton;
