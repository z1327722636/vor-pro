"use client";

import { Check } from "lucide-react";
import { type CSSProperties, type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

type DropdownOption = {
  value: string;
  label: string;
  hint?: string;
  iconSrc?: string;
};

type DropdownProps = {
  options: readonly DropdownOption[];
  name?: string;
  id?: string;
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  onValueChange?: (value: string) => void;
};

const VIEWPORT_PADDING = 8;
const MENU_GAP = 8;
const MENU_MAX_HEIGHT = 288;
const MENU_MIN_HEIGHT = 96;

export function Dropdown({
  options,
  name,
  id,
  value,
  defaultValue,
  placeholder = "请选择",
  ariaLabel,
  disabled = false,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  onValueChange
}: DropdownProps) {
  const fallbackId = useId();
  const triggerId = id ?? fallbackId;
  const menuId = `${triggerId}-menu`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties | null>(null);
  const [internalValue, setInternalValue] = useState(defaultValue ?? options[0]?.value ?? "");
  const selectedValue = value ?? internalValue;
  const selectedIndex = useMemo(() => Math.max(0, options.findIndex((item) => item.value === selectedValue)), [options, selectedValue]);
  const selectedOption = options.find((item) => item.value === selectedValue);

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setIsOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutside);
    return () => document.removeEventListener("mousedown", closeOnOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setMenuStyle(null);
      return;
    }

    function updateMenuPosition() {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const triggerRect = trigger.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - triggerRect.bottom - MENU_GAP - VIEWPORT_PADDING;
      const spaceAbove = triggerRect.top - MENU_GAP - VIEWPORT_PADDING;
      const naturalHeight = Math.min(menu.scrollHeight, MENU_MAX_HEIGHT);
      const shouldOpenUp = spaceBelow < naturalHeight && spaceAbove > spaceBelow;
      const availableHeight = Math.max(MENU_MIN_HEIGHT, shouldOpenUp ? spaceAbove : spaceBelow);
      const maxHeight = Math.min(MENU_MAX_HEIGHT, availableHeight);
      const visibleHeight = Math.min(naturalHeight, maxHeight);
      const maxWidth = Math.max(0, viewportWidth - VIEWPORT_PADDING * 2);
      const width = Math.min(triggerRect.width, maxWidth);
      const maxLeft = Math.max(VIEWPORT_PADDING, viewportWidth - width - VIEWPORT_PADDING);
      const left = Math.min(Math.max(VIEWPORT_PADDING, triggerRect.left), maxLeft);
      const idealTop = shouldOpenUp ? triggerRect.top - MENU_GAP - visibleHeight : triggerRect.bottom + MENU_GAP;
      const maxTop = Math.max(VIEWPORT_PADDING, viewportHeight - visibleHeight - VIEWPORT_PADDING);
      const top = Math.min(Math.max(VIEWPORT_PADDING, idealTop), maxTop);

      setMenuStyle({ position: "fixed", top, left, width, maxHeight });
    }

    updateMenuPosition();
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);

    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen, options.length]);

  function openDropdown() {
    setMenuStyle(null);
    setIsOpen(true);
  }

  function toggleDropdown() {
    if (isOpen) setIsOpen(false);
    else openDropdown();
  }

  function choose(nextValue: string) {
    if (value === undefined) setInternalValue(nextValue);
    onValueChange?.(nextValue);
    setIsOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled || options.length === 0) return;

    if (event.key === "Escape") {
      setIsOpen(false);
      return;
    }

    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) event.preventDefault();

    if (event.key === "ArrowDown") {
      if (!isOpen) {
        openDropdown();
        return;
      }
      choose(options[(selectedIndex + 1) % options.length].value);
    }

    if (event.key === "ArrowUp") {
      if (!isOpen) {
        openDropdown();
        return;
      }
      choose(options[(selectedIndex - 1 + options.length) % options.length].value);
    }

    if (event.key === "Enter" || event.key === " ") toggleDropdown();
  }

  const menu = isOpen ? (
    <div
      ref={menuRef}
      id={menuId}
      role="listbox"
      aria-labelledby={triggerId}
      style={menuStyle ?? { position: "fixed", visibility: "hidden" }}
      className={`z-50 overflow-y-auto rounded-2xl border border-white/10 bg-valorant-panel/95 p-1 text-sm text-valorant-text shadow-2xl shadow-black/50 backdrop-blur-xl ${menuClassName}`}
    >
      {options.map((item) => {
        const isSelected = item.value === selectedValue;
        return (
          <button
            key={item.value}
            type="button"
            role="option"
            aria-selected={isSelected}
            onClick={() => choose(item.value)}
            className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
              isSelected ? "bg-valorant-red/15 text-valorant-red" : "text-valorant-muted hover:bg-white/[0.06] hover:text-valorant-text"
            }`}
          >
            <span className="flex min-w-0 items-center gap-2">
              {item.iconSrc ? <img src={item.iconSrc} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" aria-hidden="true" /> : null}
              <span className="min-w-0">
                <span className="block truncate font-semibold">{item.label}</span>
                {item.hint ? <span className="mt-0.5 block truncate text-xs text-white/40">{item.hint}</span> : null}
              </span>
            </span>
            {isSelected ? <Check className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name ? <input type="hidden" name={name} value={selectedValue} /> : null}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={menuId}
        disabled={disabled}
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        className={`group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-left text-sm text-valorant-text outline-none transition hover:border-valorant-red hover:bg-white/[0.06] focus:border-valorant-red focus:shadow-neon disabled:cursor-not-allowed disabled:opacity-60 ${buttonClassName}`}
      >
        <span className="flex min-w-0 items-center gap-2">
          {selectedOption?.iconSrc ? <img src={selectedOption.iconSrc} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" aria-hidden="true" /> : null}
          <span className="min-w-0 truncate">{selectedOption?.label ?? placeholder}</span>
        </span>
        <span
          className={`h-2 w-2 shrink-0 border-b-2 border-r-2 border-current text-valorant-muted transition group-hover:text-valorant-red ${
            isOpen ? "translate-y-0.5 rotate-[225deg] text-valorant-red" : "-translate-y-0.5 rotate-45"
          }`}
          aria-hidden="true"
        />
      </button>
      {menu && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </div>
  );
}
