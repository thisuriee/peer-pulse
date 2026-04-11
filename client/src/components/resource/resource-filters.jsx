import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const ResourceFilters = ({ searchTerm, onSearchChange, activeFilter, onFilterChange }) => {
  const filterOptions = ['All', 'Document', 'Video', 'Link'];

  return (
    <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
      <div className="relative w-full md:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search resources by title or description..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap gap-2 w-full md:w-auto">
        {filterOptions.map((filter) => (
          <Badge
            key={filter}
            variant={activeFilter === filter.toLowerCase() ? 'default' : 'outline'}
            className="cursor-pointer px-4 py-1 hover:bg-primary/90"
            onClick={() => onFilterChange(filter.toLowerCase())}
          >
            {filter}
          </Badge>
        ))}
      </div>
    </div>
  );
};
