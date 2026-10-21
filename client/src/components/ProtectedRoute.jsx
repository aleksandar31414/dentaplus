import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/** Route guard: role="user" -> any logged-in user, role="admin" -> admins only. */
export default function ProtectedRoute({ role = 'user', children }) {
  const { isLoggedIn, isAdmin } = useAuth();
  const location = useLocation();
  if (!isLoggedIn) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  if (role === 'admin' && !isAdmin) {
    return (
      <div className="alert alert-warning">
        <i className="bi bi-shield-lock me-2" />Оваа страница е достапна само за администратори.
      </div>
    );
  }
  return children;
}
