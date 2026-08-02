import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accessible label — required because the field has no visible label. */
  label: string;
  className?: string;
  id?: string;
};

/** Search field with a leading icon and an accessible name. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
  className,
  id,
}: SearchInputProps) {
  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder ?? label}
        aria-label={label}
        className="pl-9"
      />
    </div>
  );
}
