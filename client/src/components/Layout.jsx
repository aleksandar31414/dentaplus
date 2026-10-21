import { useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Navbar, Nav, Container, NavDropdown } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { initials } from '../pipes';

/** Top navigation – items depend on the role (guest / patient / admin). */
export function AppNavbar() {
  const { user, isLoggedIn, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  useEffect(() => setExpanded(false), [location.pathname, location.search]);

  const links = [
    ['/', 'Почетна', true],
    ['/services', 'Услуги и цени'],
    ['/dentists', 'Стоматолози'],
    ['/search', 'Пребарување'],
    ['/reviews', 'Рецензии'],
  ];

  return (
    <>
      <div className="info-strip d-none d-md-block">
        <Container className="d-flex justify-content-between py-1">
          <span><i className="bi bi-clock me-1" />Пон–Пет 08–20 · Саб 08–14</span>
          <span><i className="bi bi-geo-alt me-1" />ул. Илинденска 1, Скопје · <a href="tel:+38923100100"><i className="bi bi-telephone me-1" />02 3100 100</a></span>
        </Container>
      </div>
      <Navbar expand="lg" className="dp-nav py-2" expanded={expanded} onToggle={setExpanded} collapseOnSelect>
        <Container>
          <Navbar.Brand as={Link} to="/" className="dp-brand">
            <img src="/favicon.svg" alt="" /> Denta<span>Plus</span>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="mx-auto gap-1">
              {links.map(([to, label, end]) => (
                <Nav.Link as={NavLink} to={to} end={end} key={to} eventKey={to}>{label}</Nav.Link>
              ))}
              {isAdmin && <Nav.Link as={NavLink} to="/admin/appointments" eventKey="/admin/appointments"><i className="bi bi-calendar2-check me-1" />Термини</Nav.Link>}
            </Nav>
            <Nav className="align-items-lg-center gap-2">
              {!isAdmin && <Link to="/book" className="btn btn-primary btn-sm"><i className="bi bi-calendar-plus me-1" />Закажи термин</Link>}
              {isLoggedIn ? (
                <NavDropdown align="end" title={<span><span className="avatar avatar-sm me-1">{initials(user.username)}</span>{user.username}</span>}>
                  {!isAdmin && (
                    <>
                      <NavDropdown.Item as={Link} to="/my-appointments"><i className="bi bi-calendar-week me-2" />Мои термини</NavDropdown.Item>
                      <NavDropdown.Item as={Link} to="/my-record"><i className="bi bi-clipboard2-pulse me-2" />Мој картон</NavDropdown.Item>
                    </>
                  )}
                  <NavDropdown.Item as={Link} to="/history"><i className="bi bi-clock-history me-2" />Историја</NavDropdown.Item>
                  {isAdmin && (
                    <>
                      <NavDropdown.Divider />
                      <NavDropdown.Header>Ординација</NavDropdown.Header>
                      <NavDropdown.Item as={Link} to="/admin/appointments"><i className="bi bi-calendar2-check me-2" />Управување со термини</NavDropdown.Item>
                      <NavDropdown.Item as={Link} to="/dentists/new"><i className="bi bi-person-plus me-2" />Нов стоматолог</NavDropdown.Item>
                      <NavDropdown.Item as={Link} to="/admin/users"><i className="bi bi-people me-2" />Пациенти и корисници</NavDropdown.Item>
                      <NavDropdown.Item as={Link} to="/dashboard"><i className="bi bi-graph-up me-2" />Статистика</NavDropdown.Item>
                      <NavDropdown.Item as={Link} to="/db"><i className="bi bi-database me-2" />База (/db)</NavDropdown.Item>
                    </>
                  )}
                  <NavDropdown.Divider />
                  <NavDropdown.Item onClick={() => { logout(); navigate('/'); }}><i className="bi bi-box-arrow-right me-2" />Одјава</NavDropdown.Item>
                </NavDropdown>
              ) : (
                <>
                  <Nav.Link as={NavLink} to="/login" eventKey="/login"><i className="bi bi-person me-1" />Најава</Nav.Link>
                  <Link to="/register" className="btn btn-soft btn-sm">Регистрација</Link>
                </>
              )}
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
    </>
  );
}

export function AppFooter() {
  return (
    <footer className="dp-footer py-5">
      <div className="container">
        <div className="row g-4">
          <div className="col-md-4">
            <div className="dp-brand text-white mb-2"><img src="/favicon.svg" alt="" /> Denta<span>Plus</span></div>
            <p className="small mb-0">Современа стоматолошка ординација. Закажете преглед онлајн за 1 минута.</p>
          </div>
          <div className="col-6 col-md-3">
            <h6>Работно време</h6>
            <div className="small">Понеделник – Петок: 08–20 ч.<br />Сабота: 08–14 ч.<br />Недела и празници: затворено</div>
          </div>
          <div className="col-6 col-md-3">
            <h6>Контакт</h6>
            <div className="small">ул. Илинденска 1, Скопје<br /><a href="tel:+38923100100">02 3100 100</a><br /><a href="mailto:info@dentaplus.mk">info@dentaplus.mk</a></div>
          </div>
          <div className="col-md-2">
            <h6>Линкови</h6>
            <div className="small d-flex flex-column">
              <Link to="/services">Ценовник</Link>
              <Link to="/dentists">Тим</Link>
              <a href="/api/docs/" target="_blank" rel="noreferrer">REST API</a>
            </div>
          </div>
        </div>
        <hr className="border-secondary my-4" />
        <div className="small d-flex flex-wrap justify-content-between gap-2">
          <span>&copy; {new Date().getFullYear()} DentaPlus · Веб програмирање</span>
          <span>Празници: Nager.Date API</span>
        </div>
      </div>
    </footer>
  );
}

/** Uniform page frame: navigation, content, footer */
export default function Layout() {
  return (
    <div className="d-flex flex-column min-vh-100">
      <AppNavbar />
      <main className="container py-4 py-lg-5 flex-grow-1">
        <Outlet />
      </main>
      <AppFooter />
    </div>
  );
}
