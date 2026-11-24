import { useLogoutMutation } from "@/redux/api/auth/authApi";
import baseApi from "@/redux/api/baseApi";
import { logout } from "@/redux/features/user/authSlice";
import { useAppDispatch } from "@/redux/hook";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function useLogout() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [logoutApi, { isLoading }] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
      toast.success("Logout successful!");
    } catch {
      // Clear local session even if server logout call fails
    } finally {
      dispatch(logout());
      dispatch(baseApi.util.resetApiState());
      router.replace("/login");
      router.refresh();
    }
  };

  return { handleLogout, isLoading };
}
