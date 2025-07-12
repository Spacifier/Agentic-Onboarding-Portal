import { Navigate ,Outlet } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem("accessToken");
  return isAuthenticated ? <Outlet/> : <Navigate to="/" replace />;
};

export default ProtectedRoute;
