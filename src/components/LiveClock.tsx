"use client";

import { useEffect, useState } from "react";

function format(d: Date) {
  const local = d.toLocaleTimeString("en-US", { hour12: false });
  const utc = d.toISOString().slice(11, 19);
  return { local, utc };
}

export default function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return <span className="tabular hidden text-[10px] text-neutral-600 md:inline">--:--:--</span>;
  }

  const { local, utc } = format(now);
  return (
    <span className="tabular hidden items-baseline gap-2 text-[10px] text-neutral-500 md:flex">
      <span>
        LOC <span className="text-amber-300">{local}</span>
      </span>
      <span>
        UTC <span className="text-neutral-400">{utc}</span>
      </span>
    </span>
  );
}
