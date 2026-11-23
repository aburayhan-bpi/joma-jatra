import { Icons } from "@/utils/icons";

interface PassViewToggleBtnProps<T extends Record<string, boolean>> {
  field: keyof T;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<T>>;
}

const PassViewToggleBtn = <T extends Record<string, boolean>>({
  field,
  showPassword,
  setShowPassword,
}: PassViewToggleBtnProps<T>) => {
  return (
    <button
      type="button"
      onClick={() =>
        setShowPassword((prev: T) => ({
          ...prev,
          [field]: !prev[field],
        }))
      }
      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground transition-colors cursor-pointer"
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? (
        <Icons.Eye className="h-5 w-5" />
      ) : (
        <Icons.EyeOff className="h-5 w-5" />
      )}
    </button>
  );
};

export default PassViewToggleBtn;

// how to use this button

/* <PassViewToggleBtn
  showPassword={showPassword}
  setShowPassword={setShowPassword}
/>; */
