/** All popup windows are built on the react-bootstrap modal component. */
import { useState } from 'react';
import { Modal, Button } from 'react-bootstrap';

/** Generic confirmation popup (used for every delete). */
export function ConfirmModal({ show, title = 'Потврда', children, confirmText = 'Потврди', variant = 'danger', onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton className={`bg-${variant} text-white`}>
        <Modal.Title as="h5"><i className="bi bi-exclamation-triangle me-2" />{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {children}
        {error && <div className="alert alert-danger mt-3 mb-0">{error}</div>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onCancel} disabled={busy}>Откажи</Button>
        <Button variant={variant} onClick={confirm} disabled={busy}>
          {busy && <span className="spinner-border spinner-border-sm me-2" />}{confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/** Image zoom popup with zoom-in / zoom-out controls. */
export function ImageZoomModal({ show, src, alt, onHide }) {
  const [zoom, setZoom] = useState(1);
  const close = () => { setZoom(1); onHide(); };
  return (
    <Modal show={show} onHide={close} centered size="lg">
      <Modal.Header closeButton><Modal.Title as="h5">{alt}</Modal.Title></Modal.Header>
      <Modal.Body className="text-center zoom-body">
        <img src={src} alt={alt} style={{ transform: `scale(${zoom})` }} className="img-fluid zoom-img" />
      </Modal.Body>
      <Modal.Footer className="justify-content-center">
        <Button variant="outline-secondary" onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}><i className="bi bi-zoom-out" /></Button>
        <span className="mx-2">{Math.round(zoom * 100)}%</span>
        <Button variant="outline-secondary" onClick={() => setZoom((z) => Math.min(3, z + 0.25))}><i className="bi bi-zoom-in" /></Button>
      </Modal.Footer>
    </Modal>
  );
}

/** Generic modal with a form body (e.g. add/edit club). */
export function FormModal({ show, title, onHide, onSubmit, busy, children, submitText = 'Зачувај', size }) {
  return (
    <Modal show={show} onHide={onHide} centered size={size}>
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} noValidate>
        <Modal.Header closeButton><Modal.Title as="h5">{title}</Modal.Title></Modal.Header>
        <Modal.Body><div className="row g-3">{children}</div></Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>Откажи</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy && <span className="spinner-border spinner-border-sm me-2" />}{submitText}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
