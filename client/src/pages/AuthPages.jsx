import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FormField from '../components/FormField';
import { validate, loginSchema, registerSchema } from '../utils/validators';

function useForm(initial) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [busy, setBusy] = useState(false);
  const onChange = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((e) => ({ ...e, [name]: undefined }));
  };
  return { values, setValues, errors, setErrors, serverError, setServerError, busy, setBusy, onChange };
}

function AuthArt({ title, text }) {
  return (
    <div className="auth-art">
      <h2 className="h3 mb-1">{title}</h2>
      <p className="mb-0 opacity-75">{text}</p>
    </div>
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const f = useForm({ email: '', password: '' });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(f.values, loginSchema);
    f.setErrors(errs);
    if (Object.keys(errs).length) return;
    f.setBusy(true);
    f.setServerError(null);
    try {
      await login(f.values.email.trim(), f.values.password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      f.setServerError(err.message);
      f.setErrors(err.errors || {});
    } finally {
      f.setBusy(false);
    }
  };

  return (
    <div className="auth-wrap mx-auto" style={{ maxWidth: 960 }}>
      <AuthArt title="Добредојдовте назад" text="Најавете се за да закажете термин и да го видите вашиот забен картон." />
      <div className="auth-form">
        <span className="kicker"><i className="bi bi-person" />Најава</span>
        <h1 className="h2 mt-2 mb-4">Најава на профил</h1>
        {location.state?.from && <div className="alert alert-info small">Најавете се за да продолжите.</div>}
        {f.serverError && <div className="alert alert-danger">{f.serverError}</div>}
        <form onSubmit={submit} noValidate className="row g-3">
          <FormField label="Е-пошта" name="email" type="email" value={f.values.email} onChange={f.onChange} error={f.errors.email} autoComplete="email" required />
          <FormField label="Лозинка" name="password" type="password" value={f.values.password} onChange={f.onChange} error={f.errors.password} autoComplete="current-password" required />
          <div className="col-12">
            <button type="submit" className="btn btn-primary btn-lg w-100" disabled={f.busy}>
              {f.busy && <span className="spinner-border spinner-border-sm me-2" />}Најави се
            </button>
          </div>
        </form>
        <p className="text-center mt-3 mb-0 text-muted">Прв пат кај нас? <Link to="/register">Креирајте профил</Link></p>
        <details className="small text-muted mt-3">
          <summary>Тест сметки</summary>
          admin@dentaplus.mk / Admin1234 (ординација)<br />marija@dentaplus.mk / Pacient123 (пациент)
        </details>
      </div>
    </div>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const f = useForm({ fullName: '', username: '', email: '', phone: '', password: '', confirmPassword: '', emailNotifications: true });

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(f.values, registerSchema);
    f.setErrors(errs);
    if (Object.keys(errs).length) return;
    f.setBusy(true);
    f.setServerError(null);
    try {
      const { confirmPassword, ...data } = f.values;
      await register({ ...data, username: data.username.trim(), email: data.email.trim(), fullName: data.fullName.trim(), phone: data.phone.trim() || undefined });
      navigate('/book', { replace: true });
    } catch (err) {
      f.setServerError(err.message);
      f.setErrors(err.errors || {});
    } finally {
      f.setBusy(false);
    }
  };

  return (
    <div className="auth-wrap mx-auto" style={{ maxWidth: 1040 }}>
      <AuthArt title="Нов пациент?" text="Регистрацијата е бесплатна. Потоа закажувате онлајн и добивате потврди по е-пошта." />
      <div className="auth-form">
        <span className="kicker"><i className="bi bi-person-plus" />Регистрација</span>
        <h1 className="h2 mt-2 mb-4">Креирајте профил</h1>
        {f.serverError && <div className="alert alert-danger">{f.serverError}</div>}
        <form onSubmit={submit} noValidate className="row g-3">
          <FormField className="col-md-6" label="Име и презиме" name="fullName" value={f.values.fullName} onChange={f.onChange} error={f.errors.fullName} required />
          <FormField className="col-md-6" label="Корисничко име" name="username" value={f.values.username} onChange={f.onChange} error={f.errors.username} help="3–20 знаци: букви, бројки, . и _" required />
          <FormField className="col-md-6" label="Е-пошта" name="email" type="email" value={f.values.email} onChange={f.onChange} error={f.errors.email} required />
          <FormField className="col-md-6" label="Телефон" name="phone" type="tel" value={f.values.phone} onChange={f.onChange} error={f.errors.phone} placeholder="+389 70 123 456" />
          <FormField className="col-md-6" label="Лозинка" name="password" type="password" value={f.values.password} onChange={f.onChange} error={f.errors.password} help="Мин. 8 знаци, буква и бројка" autoComplete="new-password" required />
          <FormField className="col-md-6" label="Потврди лозинка" name="confirmPassword" type="password" value={f.values.confirmPassword} onChange={f.onChange} error={f.errors.confirmPassword} autoComplete="new-password" required />
          <div className="col-12">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" id="notif" checked={f.values.emailNotifications} onChange={(e) => f.onChange('emailNotifications', e.target.checked)} />
              <label className="form-check-label" htmlFor="notif">Испраќајте ми потврди и потсетници по е-пошта</label>
            </div>
          </div>
          <div className="col-12">
            <button type="submit" className="btn btn-primary btn-lg w-100" disabled={f.busy}>
              {f.busy && <span className="spinner-border spinner-border-sm me-2" />}Креирај профил
            </button>
          </div>
        </form>
        <p className="text-center mt-3 mb-0 text-muted">Веќе имате профил? <Link to="/login">Најавете се</Link></p>
      </div>
    </div>
  );
}
