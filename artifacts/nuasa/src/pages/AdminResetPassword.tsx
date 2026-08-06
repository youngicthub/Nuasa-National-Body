import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * The old token-based admin reset-password route is no longer used.
 * The API now uses an OTP-based flow handled by /forgot-password.
 * Redirect anyone landing here to that page.
 */
const AdminResetPassword = () => {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/forgot-password", { replace: true });
  }, [navigate]);

  return null;
};

export default AdminResetPassword;
