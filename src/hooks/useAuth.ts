// isAuthenticated = true/false

import { useAppSelector } from "@/redux/hook";
import { useEffect } from "react";
import Cookies from "js-cookie";
import { decodeJWT } from "@/utils/decodeJWT";

const useAuth = () => {
  const token = useAppSelector((state) => state?.auth?.accessToken);

  useEffect(() => {
    if (token && !Cookies.get("accessToken")) {
      let accessExpires: Date | undefined;
      const decodedAccess = decodeJWT<{ exp?: number }>(token);
      if (decodedAccess?.exp) {
        accessExpires = new Date(decodedAccess.exp * 1000);
      }
      Cookies.set("accessToken", token, { expires: accessExpires || 7 });
    }
  }, [token]);

  return !!token;
};
export default useAuth;

