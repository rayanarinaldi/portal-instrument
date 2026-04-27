import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  listKey: string;
  placeholder?: string;
  className?: string;
}

export default function ComboboxCRUD({ value, onChange, listKey, placeholder, className }: Props) {
  const [items, setItems] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(listKey) || "[]"); } catch { return []; }
  });
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState(value || "");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setInputVal(value || ""); }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const saveItems = (newItems: string[]) => {
    setItems(newItems);
    localStorage.setItem(listKey, JSON.stringify(newItems));
  };

  const addItem = () => {
    const trimmed = inputVal.trim();
    if (trimmed && !items.includes(trimmed)) {
      saveItems([...items, trimmed]);
    }
  };

  const deleteItem = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveItems(items.filter((i) => i !== item));
  };

  const filtered = inputVal
    ? items.filter((i) => i.toLowerCase().includes(inputVal.toLowerCase()))
    : items;

  return (
    <div className={`relative flex gap-1 flex-1 ${className || ""}`} ref={containerRef}>
      <Input
        value={inputVal}
        onChange={(e) => { setInputVal(e.target.value); onChange(e.target.value); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="h-8 text-sm"
        autoComplete="off"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        title="Simpan ke daftar"
        onClick={addItem}
      >
        <Plus className="h-3 w-3" />
      </Button>
      {open && items.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full bg-white border border-border rounded-md shadow-lg max-h-48 overflow-auto">
          {(filtered.length > 0 ? filtered : items).map((item) => (
            <div
              key={item}
              className="flex items-center justify-between px-3 py-1.5 hover:bg-muted cursor-pointer text-sm"
              onMouseDown={(e) => {
                e.preventDefault();
                setInputVal(item);
                onChange(item);
                setOpen(false);
              }}
            >
              <span>{item}</span>
              <button
                type="button"
                className="text-destructive hover:text-destructive/70 ml-2"
                onMouseDown={(e) => { e.stopPropagation(); deleteItem(item, e); }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
