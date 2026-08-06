import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Email verification is disabled — all accounts can log in immediately.
 * Redirect anyone landing on this page directly to login.
 */
const VerifyEmail = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/login", { replace: true });
  }, [navigate]);
  return null;
};

export default VerifyEmail;
