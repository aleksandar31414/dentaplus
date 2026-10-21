/**
 * Reusable form field with label, Bootstrap validation state and error message.
 * type: text | email | password | number | date | url | textarea | select | radio
 */
export default function FormField({
  label, name, value, onChange, error, type = 'text', options = [], required = false,
  help, className = 'col-12', ...rest
}) {
  const id = `f-${name}`;
  const invalid = error ? ' is-invalid' : '';
  const handle = (e) => onChange(name, e.target.value);

  let control;
  if (type === 'textarea') {
    control = <textarea id={id} className={`form-control${invalid}`} value={value ?? ''} onChange={handle} rows={3} {...rest} />;
  } else if (type === 'select') {
    control = (
      <select id={id} className={`form-select${invalid}`} value={value ?? ''} onChange={handle} {...rest}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    );
  } else if (type === 'radio') {
    control = (
      <div className={invalid ? 'is-invalid' : ''}>
        {options.map(([v, l]) => (
          <div className="form-check form-check-inline" key={v}>
            <input className="form-check-input" type="radio" id={`${id}-${v}`} name={name} value={v} checked={value === v} onChange={handle} />
            <label className="form-check-label" htmlFor={`${id}-${v}`}>{l}</label>
          </div>
        ))}
      </div>
    );
  } else {
    control = <input id={id} type={type} className={`form-control${invalid}`} value={value ?? ''} onChange={handle} {...rest} />;
  }

  return (
    <div className={className}>
      {label && <label htmlFor={id} className="form-label">{label}{required && <span className="text-danger"> *</span>}</label>}
      {control}
      {error ? <div className="invalid-feedback d-block">{error}</div> : help && <div className="form-text">{help}</div>}
    </div>
  );
}
