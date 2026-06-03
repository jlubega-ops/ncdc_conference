/**
 * @param {object} props
 * @param {string} [props.htmlFor]
 * @param {boolean} [props.required]
 * @param {string} [props.className]
 */
export function FieldLabel({ htmlFor, required, className, children }) {
  return (
    <label
      htmlFor={htmlFor}
      className={className ?? "mb-1.5 block text-sm font-medium text-foreground"}
    >
      {children}
      {required ? <span className="text-error"> *</span> : null}
    </label>
  );
}
