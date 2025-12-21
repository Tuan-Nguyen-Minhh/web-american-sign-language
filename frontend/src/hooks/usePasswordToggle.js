import { useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const usePasswordToggle = () => {
  const [visible, setVisible] = useState(false);

  const toggleVisibility = () => {
    setVisible(prevVisible => !prevVisible);
  };

  // Return the icon component
  const Icon = visible ? FaEyeSlash : FaEye;

  // Return the input type
  const inputType = visible ? "text" : "password";

  return {
    inputType,
    Icon,
    toggleVisibility,
    visible
  };
};

export default usePasswordToggle;