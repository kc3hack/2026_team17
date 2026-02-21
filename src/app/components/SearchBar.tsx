import { Search } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, onSearch, placeholder }: SearchBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="flex gap-4 max-w-3xl w-full">
      <div className="flex-1 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || '特産品を検索（例：ラーメン、海鮮、寿司、牛料理、鍋、うどん）'}
          className="pl-12 h-14 text-base"
        />
      </div>
      <Button onClick={onSearch} size="lg" className="px-8 h-14 bg-red-900 text-white hover:bg-red-200">
        検索
      </Button>
    </div>
  );
}
