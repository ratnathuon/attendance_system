import React from "react";
import { ChevronDown } from "lucide-react";

export interface FilterOption {
  label: string;
  value: string | number;
}

export interface FilterSelectProps {
  icon?: React.ReactNode;
  value: string | number;
  onChange: (value: string) => void;
  options: FilterOption[];
  className?: string;
  selectClassName?: string;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  icon,
  value,
  onChange,
  options,
  className = "",
  selectClassName = "",
}) => {
  const isFiltered = value !== "all" && value !== "";

  return (
    <div className={`flex items-center gap-1.5 shrink-0 ${className}`}>
      {icon && <span className="text-slate-400 shrink-0">{icon}</span>}
      <div className="relative inline-flex items-center">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`appearance-none rounded-xl pl-3.5 pr-8 py-2 text-xs sm:text-sm font-semibold cursor-pointer shadow-2xs transition-all outline-none border ${
            isFiltered
              ? "bg-indigo-50/80 border-indigo-300 text-indigo-900 hover:bg-indigo-100/70 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              : "bg-slate-50/70 hover:bg-slate-100/80 border-slate-200 text-slate-700 hover:border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          } ${selectClassName}`}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-white text-slate-800">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
      </div>
    </div>
  );
};
