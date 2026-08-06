import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * The old token-based reset-password route is no longer used.
 * Redirect anyone landing here to the new OTP-based forgot-password flow.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/forgot-password", { replace: true });
  }, [navigate]);
  return null;
};

export default ResetPassword;
