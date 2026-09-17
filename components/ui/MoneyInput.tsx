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

/**
 * Posición del separador decimal recién tipeado (si corresponde) dentro de
 * `newVal`, o -1 si no aplica. Solo cuenta como "recién tipeado" si todavía
 * no había un decimal establecido en `oldRaw` — una vez que ya hay uno,
 * cualquier "," o "." suelto que aparezca más adelante es siempre ruido del
 * agrupador de miles (nunca un segundo separador decimal), porque si no,
 * seguir tipeando dígitos de un número grande con cotización decimal ya
 * puesta (ej. "12345" después de "1.200") se malinterpretaría como decimal.
 */
function typedSeparatorPos(newVal: string, caretPos: number, oldRaw: string): number {
  if (oldRaw.includes('.')) return -1;
  const justTyped = caretPos > 0 ? newVal[caretPos - 1] : '';
  return justTyped === ',' || justTyped === '.' ? caretPos - 1 : -1;
}

/**
 * A partir del texto tipeado (con separadores es-AR ya puestos por
 * formatDisplay, más lo que el usuario acaba de escribir/borrar), calcula el
 * nuevo valor crudo ("15000.5"). Acepta "," o "." como separador decimal al
 * tipear: muchos teclados numéricos (inputMode="decimal") insertan "." sin
 * importar el idioma del dispositivo, así que si solo aceptáramos "," no se
 * podrían cargar decimales en esos casos.
 */
function parseInput(newVal: string, caretPos: number, oldRaw: string): string {
  // Pegar varios caracteres de una (paste) no tiene una posición de "recién
  // tipeado" confiable: se procesa aparte, tomando el último separador de
  // todo el texto pegado como el decimal.
  const pastedLength = newVal.length - (oldRaw ? formatDisplay(oldRaw).length : 0);
  if (pastedLength >= 2) {
    const cleaned = newVal.replace(/[^\d,.]/g, '');
    const lastSep = Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.'));
    if (lastSep === -1) return cleaned.replace(/\D/g, '');
    return `${cleaned.slice(0, lastSep).replace(/\D/g, '')}.${cleaned.slice(lastSep + 1).replace(/\D/g, '')}`;
  }

  const sepPos = typedSeparatorPos(newVal, caretPos, oldRaw);
  if (sepPos !== -1) {
    const before = newVal.slice(0, sepPos).replace(/\D/g, '');
    const after = newVal.slice(sepPos + 1).replace(/\D/g, '');
    return `${before}.${after}`;
  }

  if (!oldRaw.includes('.')) {
    return newVal.replace(/\D/g, '');
  }

  // Ya había decimal: la "," (siempre la única en el texto formateado) es el
  // separador real; cualquier "." es solo agrupador de miles.
  const commaIdx = newVal.indexOf(',');
  if (commaIdx === -1) {
    // El usuario borró la coma: ya no queda parte decimal.
    return newVal.replace(/\D/g, '');
  }
  return `${newVal.slice(0, commaIdx).replace(/\D/g, '')}.${newVal.slice(commaIdx + 1).replace(/\D/g, '')}`;
}

/**
 * Cuántos "tokens" (dígitos, más el separador decimal si el caret ya lo
 * cruzó) hay antes del caret en `newVal`. Sirve para reubicar el cursor en
 * el texto ya reformateado sin que "salte" antes de una coma/punto que el
 * usuario recién tipeó (el bug original: tipear "7" ",""7" terminaba en
 * "77," en vez de "7,7" porque el cursor quedaba antes de la coma).
 */
function tokensBeforeCaret(newVal: string, caretPos: number, oldRaw: string): number {
  let digitsBeforeCaret = 0;
  for (let i = 0; i < caretPos && i < newVal.length; i++) {
    if (/\d/.test(newVal[i])) digitsBeforeCaret++;
  }

  const sepPos = typedSeparatorPos(newVal, caretPos, oldRaw);
  const decimalMarkerPos = sepPos !== -1 ? sepPos : oldRaw.includes('.') ? newVal.indexOf(',') : -1;
  const crossedDecimal = decimalMarkerPos !== -1 && caretPos > decimalMarkerPos;

  return digitsBeforeCaret + (crossedDecimal ? 1 : 0);
}

/** Ubica, en el texto ya formateado (que tiene a lo sumo una "," decimal), la posición de `tokenCount` tokens. */
function caretForTokenCount(str: string, tokenCount: number): number {
  if (tokenCount <= 0) return 0;
  let count = 0;
  for (let i = 0; i < str.length; i++) {
    if (/\d/.test(str[i]) || str[i] === ',') {
      count++;
      if (count === tokenCount) return i + 1;
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
  const pendingCaretTokens = useRef<number | null>(null);

  useEffect(() => {
    setDisplay(formatDisplay(value));
  }, [value]);

  useEffect(() => {
    if (pendingCaretTokens.current !== null && inputRef.current) {
      const pos = caretForTokenCount(display, pendingCaretTokens.current);
      inputRef.current.setSelectionRange(pos, pos);
      pendingCaretTokens.current = null;
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
        // Un paste (o autocompletado) inserta varios caracteres de una: no
        // hay una posición de "tecla recién tipeada" confiable, así que
        // directamente dejamos el cursor al final del resultado.
        const isPaste = el.value.length - display.length >= 2;
        pendingCaretTokens.current = isPaste
          ? Number.POSITIVE_INFINITY
          : tokensBeforeCaret(el.value, caret, value);
        const raw = parseInput(el.value, caret, value);
        setDisplay(formatDisplay(raw));
        onChange(raw);
      }}
    />
  );
}
