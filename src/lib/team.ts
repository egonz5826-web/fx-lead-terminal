// The team. `username` is the stable owner key stored on leads; `display_name`
// is what shows in the UI. Keep in sync with the seeded users table.
export interface TeamMember {
  username: string;
  display_name: string;
  role: "admin" | "rep";
}

export const TEAM: TeamMember[] = [
  { username: "emilio", display_name: "Emilio", role: "admin" },
  { username: "marcel", display_name: "Marcel Remy", role: "rep" },
  { username: "jesus", display_name: "Jesus Heiras", role: "rep" },
  { username: "beto", display_name: "Beto Flores", role: "rep" },
];

export const UNASSIGNED = "Unassigned";

// Owner dropdown values are usernames (+ Unassigned); labels are display names.
export const OWNER_OPTIONS: { value: string; label: string }[] = [
  { value: UNASSIGNED, label: UNASSIGNED },
  ...TEAM.map((m) => ({ value: m.username, label: m.display_name })),
];

export function ownerLabel(owner: string | null | undefined): string {
  if (!owner || owner === UNASSIGNED) return UNASSIGNED;
  return TEAM.find((m) => m.username === owner)?.display_name ?? owner;
}
