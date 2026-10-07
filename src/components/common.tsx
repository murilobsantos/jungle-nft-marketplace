import type { ComponentProps, ReactNode } from "react";
import { useId, useState } from "react";
import { Eye, EyeOff, Minus, Plus } from "lucide-react";
import { Button } from "./ui/button";
import { errorMessage } from "../lib/api";
export function Field({
  label,
  required,
  error,
  ...props
}: ComponentProps<"input"> & { label: string; error?: string }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {required && (
          <span className="required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <input
        id={id}
        aria-label={label}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error && (
        <small id={`${id}-error`} className="form-error">
          {error}
        </small>
      )}
    </div>
  );
}
export function Password({
  label,
  ...props
}: ComponentProps<"input"> & { label: string }) {
  const [show, setShow] = useState(false),
    id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="password-field">
        <input id={id} type={show ? "text" : "password"} {...props} />
        <button
          type="button"
          onClick={() => setShow(!show)}
          aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        >
          {show ? <Eye size={18} /> : <EyeOff size={18} />}
        </button>
      </div>
    </div>
  );
}
export function Select({
  label,
  children,
  ...props
}: ComponentProps<"select"> & { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {props.required && (
          <span className="required" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <select id={id} aria-label={label} {...props}>
        {children}
      </select>
    </div>
  );
}
export function ErrorPanel({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="empty-state" role="alert">
      <p>{errorMessage(error)}</p>
      {retry && <Button onClick={retry}>Tentar novamente</Button>}
    </div>
  );
}
export function Skeleton({ cards = 1 }: { cards?: number }) {
  return (
    <div
      className={cards > 1 ? "nft-grid" : ""}
      aria-label="Carregando"
      aria-busy="true"
    >
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}
export function Quantity({
  value,
  max,
  onChange,
  pending = false,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  pending?: boolean;
}) {
  return (
    <div className="quantity">
      <button
        type="button"
        disabled={pending || value <= 1}
        onClick={() => onChange(value - 1)}
        aria-label="Diminuir quantidade"
      >
        <Minus size={15} />
      </button>
      <span aria-live="polite">{value}</span>
      <button
        type="button"
        disabled={pending || value >= max}
        onClick={() => onChange(value + 1)}
        aria-label="Aumentar quantidade"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}
