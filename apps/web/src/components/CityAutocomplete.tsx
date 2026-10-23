"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchCities, type CitySuggestion } from "@/lib/cities";

type Props = {
  value: string;
  country: string;
  onChange: (next: { city: string; country?: string }) => void;
  placeholder?: string;
  required?: boolean;
};

export function CityAutocomplete({
  value,
  country,
  onChange,
  placeholder = "Start typing a city…",
  required,
}: Props) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);

  useEffect(() => {
    const hits = searchCities(value);
    setSuggestions(hits);
  }, [value]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <input
        className="input"
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange({ city: e.target.value });
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-md border border-ink-600 bg-ink-800 py-1 shadow-lg"
        >
          {suggestions.map((s) => (
            <li key={`${s.country}-${s.city}`}>
              <button
                type="button"
                role="option"
                className="w-full px-3 py-2 text-left text-sm text-sand-100 hover:bg-ink-700"
                onClick={() => {
                  onChange({ city: s.city, country: s.country });
                  setOpen(false);
                }}
              >
                {s.label}
                {s.country === country ? (
                  <span className="ml-2 text-xs text-teal-400">matches country</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && value.trim().length >= 2 && suggestions.length === 0 && (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-ink-600 bg-ink-800 px-3 py-2 text-xs text-sand-400">
          No bundled match. You can still use this city name as typed.
        </div>
      )}
    </div>
  );
}
