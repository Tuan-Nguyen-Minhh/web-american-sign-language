// hooks/useNavigation.js
import { useNavigate } from "react-router-dom";

export function useNavigation() {
  const navigate = useNavigate();

  const handleReturnHome = () => {
    navigate("/");
  };

  return {
    handleReturnHome,
  };
}