"use client";

import { useState } from "react";

export default function WeightField({
  name,
  label,
  description,
  defaultValue,
}: {
  name: string;
  label: string;
  description: string;
  defaultValue: number;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div className="border border-neutral-800 bg-neutral-950 p-3">
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor={name} className="text-xs font-semibold text-neutral-200">
          {label}
        </label>
        <span className="text-[10px] text-neutral-500">{description}</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          id={name}
          name={name}
          min={0}
          max={100}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="flex-1 accent-emerald-500"
        />
        <span className="w-10 text-right text-sm text-emerald-400">{value}%</span>
      </div>
    </div>
  );
}
