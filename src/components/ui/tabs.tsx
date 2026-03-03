"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error("Tabs components must be used inside <Tabs>.");
  }
  return context;
}

interface TabsProps extends ComponentProps<"div"> {
  defaultValue: string;
  children: ReactNode;
}

function Tabs({ defaultValue, className, children, ...props }: TabsProps) {
  const [value, setValue] = useState(defaultValue);
  const contextValue = useMemo(() => ({ value, setValue }), [value]);

  return (
    <TabsContext.Provider value={contextValue}>
      <div data-slot="tabs" className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="tabs-list"
      className={cn("flex items-center gap-6 border-b border-zinc-800", className)}
      {...props}
    />
  );
}

interface TabsTriggerProps extends ComponentProps<"button"> {
  value: string;
}

function TabsTrigger({ value, className, children, ...props }: TabsTriggerProps) {
  const tabs = useTabsContext();
  const active = tabs.value === value;

  return (
    <button
      data-slot="tabs-trigger"
      type="button"
      onClick={() => tabs.setValue(value)}
      className={cn(
        "border-b-2 px-1 py-3 text-sm font-medium transition-colors",
        active
          ? "border-blue-500 text-white"
          : "border-transparent text-zinc-400 hover:text-white",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

interface TabsContentProps extends ComponentProps<"div"> {
  value: string;
}

function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const tabs = useTabsContext();
  if (tabs.value !== value) {
    return null;
  }

  return (
    <div data-slot="tabs-content" className={cn("mt-6", className)} {...props}>
      {children}
    </div>
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
