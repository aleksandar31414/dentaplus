/**
 * Routing module (separate from the root App component).
 * Every screen from Part 1 has at least one component here.
 */
import { Routes, Route } from 'react-router-dom';
import Layout from '../components/Layout';
import ProtectedRoute from '../components/ProtectedRoute';
import HomePage from '../pages/HomePage';
import { LoginPage, RegisterPage } from '../pages/AuthPages';
import { ServicesPage, ServiceDetailsPage } from '../pages/ServicesPages';
import { DentistsPage, DentistDetailsPage, DentistFormPage } from '../pages/DentistsPages';
import BookingPage from '../pages/BookingPage';
import { MyAppointmentsPage, AppointmentDetailsPage, AdminAppointmentsPage } from '../pages/AppointmentsPages';
import { MyRecordPage, PatientRecordPage } from '../pages/RecordPages';
import ReviewsPage from '../pages/ReviewsPage';
import SearchPage from '../pages/SearchPage';
import DashboardPage from '../pages/DashboardPage';
import { HistoryPage, UsersPage, DbPage, NotFoundPage } from '../pages/AdminPages';

const user = (el) => <ProtectedRoute>{el}</ProtectedRoute>;
const admin = (el) => <ProtectedRoute role="admin">{el}</ProtectedRoute>;

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* guest (everyone) */}
        <Route index element={<HomePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="services/:id" element={<ServiceDetailsPage />} />
        <Route path="dentists" element={<DentistsPage />} />
        <Route path="dentists/new" element={admin(<DentistFormPage />)} />
        <Route path="dentists/:id" element={<DentistDetailsPage />} />
        <Route path="dentists/:id/edit" element={admin(<DentistFormPage />)} />
        <Route path="search" element={<SearchPage />} />
        <Route path="reviews" element={<ReviewsPage />} />
        <Route path="book" element={<BookingPage />} />
        <Route path="db" element={<DbPage />} />

        {/* registered patients */}
        <Route path="my-appointments" element={user(<MyAppointmentsPage />)} />
        <Route path="my-record" element={user(<MyRecordPage />)} />
        <Route path="appointments/:id" element={user(<AppointmentDetailsPage />)} />
        <Route path="history" element={user(<HistoryPage />)} />

        {/* clinic staff (admin) */}
        <Route path="admin/appointments" element={admin(<AdminAppointmentsPage />)} />
        <Route path="admin/users" element={admin(<UsersPage />)} />
        <Route path="admin/patients/:id" element={admin(<PatientRecordPage />)} />
        <Route path="dashboard" element={admin(<DashboardPage />)} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
