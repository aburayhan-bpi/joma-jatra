"use client";
import Dashboard from "@/components/dashboard/pages/admin/dashboard/Dashboard";

export default function DashboardRootRedirect() {
  //   const router = useRouter();
  //   const user = useSelector(selectUser);

  //   useEffect(() => {
  //     if (user?.role) {
  //       const rolePath = user.role.toLowerCase().replace('_', '-');
  //       router.replace(`/dashboard/${rolePath}`);
  //     }
  //   }, [user, router]);

  return (
    // <div className="flex h-screen w-full items-center justify-center">
    //   <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand mx-auto" />
    // </div>
    <div>
      <Dashboard />
    </div>
  );
}
