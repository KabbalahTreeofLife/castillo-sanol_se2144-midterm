import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import styled from "styled-components";

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

interface SelectProps<T extends string> {
  label?: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  size?: "small" | "normal";
  disabled?: boolean;
}

const Wrapper = styled.div`
  position: relative;
  display: inline-flex;
  flex-direction: column;
  gap: 0.2rem;
  align-self: flex-start;
`;

const Label = styled.label`
  font-size: 0.7rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
`;

const ButtonBase = styled.button<{ $open: boolean; $size: "small" | "normal" }>`
  color-scheme: light;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  min-width: ${({ $size }) => ($size === "small" ? "8rem" : "10rem")};
  border: 1px solid ${({ $open }) => ($open ? "#3b82f6" : "#cbd5e1")};
  border-radius: 6px;
  background: white;
  color: #0f172a;
  font-family: inherit;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease;
  padding: ${({ $size }) =>
    $size === "small" ? "0.35rem 0.5rem" : "0.5rem 0.6rem"};
  font-size: ${({ $size }) => ($size === "small" ? "0.85rem" : "0.9rem")};

  &:focus-visible {
    outline: 2px solid #3b82f6;
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Chevron = styled.span<{ $open: boolean }>`
  flex-shrink: 0;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-top: 6px solid #64748b;
  transition: transform 0.15s ease;
  transform: ${({ $open }) => ($open ? "rotate(180deg)" : "rotate(0deg)")};
`;

const Menu = styled.ul<{ $size: "small" | "normal" }>`
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 20;
  list-style: none;
  margin: 0;
  padding: 0.25rem;
  min-width: 100%;
  max-height: 14rem;
  overflow-y: auto;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const OptionItem = styled.li<{
  $selected: boolean;
  $focused: boolean;
  $size: "small" | "normal";
}>`
  padding: ${({ $size }) =>
    $size === "small" ? "0.35rem 0.5rem" : "0.45rem 0.6rem"};
  font-size: ${({ $size }) => ($size === "small" ? "0.85rem" : "0.9rem")};
  border-radius: 6px;
  color: #0f172a;
  cursor: pointer;
  white-space: nowrap;
  background: ${({ $selected, $focused }) =>
    $selected ? "#eff6ff" : $focused ? "#f1f5f9" : "transparent"};
  font-weight: ${({ $selected }) => ($selected ? "700" : "400")};

  &:hover {
    background: #f1f5f9;
  }
`;

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  size = "normal",
  disabled = false,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(() =>
    Math.max(
      options.findIndex((option) => option.value === value),
      0,
    ),
  );
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selectId = useId();

  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const index = options.findIndex((option) => option.value === value);
    if (index >= 0) {
      setFocusedIndex(index);
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const toggle = () => {
    if (open) {
      setOpen(false);
      return;
    }
    setFocusedIndex(
      Math.max(
        options.findIndex((option) => option.value === value),
        0,
      ),
    );
    setOpen(true);
  };

  const handleButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setFocusedIndex((index) =>
        event.key === "ArrowDown"
          ? Math.min(index + 1, options.length - 1)
          : Math.max(index - 1, 0),
      );
    }
  };

  const selected = options.find((option) => option.value === value);

  return (
    <Wrapper ref={wrapperRef}>
      {label ? (
        <Label id={`${selectId}-label`} htmlFor={selectId}>
          {label}
        </Label>
      ) : null}
      <ButtonBase
        type="button"
        id={selectId}
        $open={open}
        $size={size}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={handleButtonKeyDown}
        aria-labelledby={label ? `${selectId}-label` : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selected?.label ?? value}</span>
        <Chevron $open={open} aria-hidden="true" />
      </ButtonBase>
      {open ? (
        <Menu
          $size={size}
          role="listbox"
          aria-labelledby={label ? `${selectId}-label` : undefined}
        >
          {options.map((option, index) => (
            <OptionItem
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              $selected={option.value === value}
              $focused={index === focusedIndex}
              $size={size}
              onMouseEnter={() => setFocusedIndex(index)}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </OptionItem>
          ))}
        </Menu>
      ) : null}
    </Wrapper>
  );
}
