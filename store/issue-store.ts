import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CampusIssue, IssueCategory, IssuePriority, IssueStatus } from "@/schemas/issue-schema";

export type StatusFilterOption = "All" | IssueStatus;
export type CategoryFilterOption = "All" | IssueCategory;
export type PriorityFilterOption = "All" | IssuePriority;
export type ViewScopeOption = "all" | "mine";

interface IssueFilterState {
  // Existing filtering & scope
  searchQuery: string;
  statusFilter: StatusFilterOption;
  categoryFilter: CategoryFilterOption;
  priorityFilter: PriorityFilterOption;
  viewScope: ViewScopeOption;
  customIssues: CampusIssue[];

  // Interactive UI & Command system
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  shortcutsModalOpen: boolean;
  reportDialogOpen: boolean;
  selectedIssue: CampusIssue | null;

  // Actions
  setSearchQuery: (query: string) => void;
  setStatusFilter: (status: StatusFilterOption) => void;
  setCategoryFilter: (category: CategoryFilterOption) => void;
  setPriorityFilter: (priority: PriorityFilterOption) => void;
  setViewScope: (scope: ViewScopeOption) => void;
  resetFilters: () => void;
  addCustomIssue: (issue: CampusIssue) => void;

  // UI Actions
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsModalOpen: (open: boolean) => void;
  setReportDialogOpen: (open: boolean) => void;
  setSelectedIssue: (issue: CampusIssue | null) => void;
}

export const useIssueStore = create<IssueFilterState>()(
  persist(
    (set) => ({
      searchQuery: "",
      statusFilter: "All",
      categoryFilter: "All",
      priorityFilter: "All",
      viewScope: "all",
      customIssues: [],

      sidebarCollapsed: false,
      commandPaletteOpen: false,
      shortcutsModalOpen: false,
      reportDialogOpen: false,
      selectedIssue: null,

      setSearchQuery: (searchQuery) => set({ searchQuery }),
      setStatusFilter: (statusFilter) => set({ statusFilter }),
      setCategoryFilter: (categoryFilter) => set({ categoryFilter }),
      setPriorityFilter: (priorityFilter) => set({ priorityFilter }),
      setViewScope: (viewScope) => set({ viewScope }),
      resetFilters: () =>
        set({
          searchQuery: "",
          statusFilter: "All",
          categoryFilter: "All",
          priorityFilter: "All",
          viewScope: "all",
        }),
      addCustomIssue: (issue) =>
        set((state) => ({
          customIssues: [issue, ...state.customIssues.filter((i) => i.id !== issue.id)],
        })),

      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
      setShortcutsModalOpen: (shortcutsModalOpen) => set({ shortcutsModalOpen }),
      setReportDialogOpen: (reportDialogOpen) => set({ reportDialogOpen }),
      setSelectedIssue: (selectedIssue) => set({ selectedIssue }),
    }),
    {
      name: "campusfix-dashboard-preferences",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") {
          return window.localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        statusFilter: state.statusFilter,
        categoryFilter: state.categoryFilter,
        priorityFilter: state.priorityFilter,
        viewScope: state.viewScope,
        customIssues: state.customIssues,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);
