"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

interface DropdownMenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext() {
  const context = useContext(DropdownMenuContext);
  if (!context) {
    throw new Error("DropdownMenu components must be used inside <DropdownMenu>.");
  }
  return context;
}

interface DropdownMenuProps extends ComponentProps<"div"> {
  children: ReactNode;
}

function DropdownMenu({ className, children, ...props }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        event.target instanceof Node &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div
        ref={containerRef}
        data-slot="dropdown-menu"
        className={cn("relative inline-block", className)}
        {...props}
      >
        {children}
      </div>
    </DropdownMenuContext.Provider>
  );
}

interface DropdownMenuTriggerProps extends ComponentProps<"button"> {
  asChild?: boolean;
}

function DropdownMenuTrigger({
  className,
  asChild,
  children,
  onClick,
  ...props
}: DropdownMenuTriggerProps) {
  const { open, setOpen } = useDropdownMenuContext();

  if (asChild && children && typeof children === "object" && "props" in children) {
    const child = children as React.ReactElement<ComponentProps<"button">>;
    return (
      <span
        onClick={(event) => {
          child.props.onClick?.(event as never);
          onClick?.(event as never);
          setOpen(!open);
        }}
      >
        {child}
      </span>
    );
  }

  return (
    <button
      data-slot="dropdown-menu-trigger"
      type="button"
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event);
        setOpen(!open);
      }}
      {...props}
    >
      {children}
    </button>
  );
}

function DropdownMenuContent({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const { open } = useDropdownMenuContext();
  if (!open) {
    return null;
  }

  return (
    <div
      data-slot="dropdown-menu-content"
      className={cn(
        "absolute right-0 z-50 mt-2 min-w-40 rounded-md border border-zinc-700 bg-zinc-800 p-1 shadow-lg",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function DropdownMenuItem({
  className,
  onClick,
  ...props
}: ComponentProps<"button">) {
  const { setOpen } = useDropdownMenuContext();

  return (
    <button
      data-slot="dropdown-menu-item"
      type="button"
      className={cn(
        "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm text-zinc-200 hover:bg-zinc-700",
        className
      )}
      onClick={(event) => {
        onClick?.(event);
        setOpen(false);
      }}
      {...props}
    />
  );
}

export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger };
