"use client";

import { cn } from "@/lib/utils";
import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const inputBaseStyles =
  "w-full px-4 py-3 text-gray-900 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all duration-200 placeholder:text-gray-400";

const labelStyles = "block text-sm font-medium text-gray-700 mb-2";

const errorStyles = "mt-1 text-sm text-red-500";

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className={labelStyles}>{label}</label>}
        <input
          ref={ref}
          className={cn(
            inputBaseStyles,
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />
        {error && <p className={errorStyles}>{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className={labelStyles}>{label}</label>}
        <textarea
          ref={ref}
          className={cn(
            inputBaseStyles,
            "min-h-[120px] resize-none",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        />
        {error && <p className={errorStyles}>{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && <label className={labelStyles}>{label}</label>}
        <select
          ref={ref}
          className={cn(
            inputBaseStyles,
            "cursor-pointer",
            error && "border-red-500 focus:ring-red-500",
            className
          )}
          {...props}
        >
          <option value="">Selectionnez une option</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className={errorStyles}>{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
