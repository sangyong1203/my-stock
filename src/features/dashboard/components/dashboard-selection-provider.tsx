"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";

type SelectedSecurity = {
  symbol: string;
  market: string;
} | null;

type DashboardSelectionContextValue = {
  selectedSecurity: SelectedSecurity;
  setSelectedSecurity: (security: SelectedSecurity) => void;
};

const DashboardSelectionContext =
  createContext<DashboardSelectionContextValue | null>(null);

type Props = {
  children: ReactNode;
  initialSecurity?: SelectedSecurity;
};

export function DashboardSelectionProvider({ children, initialSecurity = null }: Props) {
  const [selectedSecurity, setSelectedSecurity] =
    useState<SelectedSecurity>(initialSecurity);

  const value = useMemo(
    () => ({
      selectedSecurity,
      setSelectedSecurity,
    }),
    [selectedSecurity],
  );

  return (
    <DashboardSelectionContext.Provider value={value}>
      {children}
    </DashboardSelectionContext.Provider>
  );
}

export function useDashboardSelection() {
  const context = useContext(DashboardSelectionContext);

  if (!context) {
    throw new Error(
      "useDashboardSelection must be used within a DashboardSelectionProvider.",
    );
  }

  return context;
}
