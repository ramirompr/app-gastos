'use client';

import { useEffect, useRef, useState } from 'react';

interface MoneyInputProps {
  /** Valor crudo (sin separadores), con "." como separador decimal, ej. "15000.5". */
  value: string;
  onChange: (raw: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

/** "15000.5" -> "15.000,5" (estilo es-AR: punto de miles, coma decimal). */
function formatDisplay(raw: string): string {
  if (!raw) return '';
  const [intPart, decPart] = raw.split('.');
  const groupedInt = (intPart || '0').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decPart !== undefined ? `${groupedInt},${decPart}` : groupedInt;
}

/** "15.000,5" (o cualquier texto tipeado con separadores es-AR) -> "15000.5". */
function parseInput(display: string): string {
  const cleaned = display.replace(/[^\d,]/g, '');
  const [intPart, ...rest] = cleaned.split(',');
  return rest.length > 0 ? `${intPart}.${rest.join('')}` : intPart;
}

function countDigitsBefore(str: string, caret: number): number {
  let count = 0;
  for (let i = 0; i < caret && i < str.length; i++) {
    if (/\d/.test(str[i])) count++;
  }
  return count;
}

function caretForDigitCount(str: string, digitCount: number): number {
  if (digitCount <= 0) return 0;
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (/\d/.test(str[i])) {
      count++;
      if (count === digitCount) return i + 1;
    }
  }
  return str.length;
}

/**
 * Input de texto numérico que muestra separador de miles mientras se tipea
 * (ej. "15.000"), manteniendo un valor crudo simple ("15000.5") para el
 * resto del código (parseFloat, validaciones, guardado en DB).
 */
export function MoneyInput({ value, onChange, placeholder, className, autoFocus }: MoneyInputProps) {
  const [display, setDisplay] = useState(() => formatDisplay(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingCaretDigits = useRef<number | null>(null);

  useEffect(() => {
    setDisplay(formatDisplay(value));
  }, [value]);

  useEffect(() => {
    if (pendingCaretDigits.current !== null && inputRef.current) {
      const pos = caretForDigitCount(display, pendingCaretDigits.current);
      inputRef.current.setSelectionRange(pos, pos);
      pendingCaretDigits.current = null;
    }
  }, [display]);

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      className={className}
      autoFocus={autoFocus}
      value={display}
      onChange={(e) => {
        const el = e.target;
        const caret = el.selectionStart ?? el.value.length;
        pendingCaretDigits.current = countDigitsBefore(el.value, caret);
        const raw = parseInput(el.value);
        setDisplay(formatDisplay(raw));
        onChange(raw);
      }}
    />
  );
}
