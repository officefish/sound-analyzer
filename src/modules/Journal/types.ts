export type JournalFilterType = 'all' | 'analysis' | 'drone' | 'calm' | 'event' | 'system';

export interface JournalFilters {
  type: JournalFilterType;
  moduleName?: string;
  search?: string;
  sortOrder: 'asc' | 'desc';
}

export interface JournalFiltersProps {
  filters: JournalFilters;
  onFilterChange: (filters: Partial<JournalFilters>) => void;
  availableModules: string[];
}