export interface WorkspaceColor {
  id: string;
  label: string;
  /** Hex background color */
  bg: string;
  /** Hex text color for contrast */
  text: string;
}

export const WORKSPACE_COLORS: WorkspaceColor[] = [
  { id: "blue",    label: "Blue",    bg: "#2563eb", text: "#ffffff" },
  { id: "green",   label: "Green",   bg: "#16a34a", text: "#ffffff" },
  { id: "purple",  label: "Purple",  bg: "#9333ea", text: "#ffffff" },
  { id: "orange",  label: "Orange",  bg: "#ea580c", text: "#ffffff" },
  { id: "pink",    label: "Pink",    bg: "#db2777", text: "#ffffff" },
  { id: "teal",    label: "Teal",    bg: "#0d9488", text: "#ffffff" },
  { id: "red",     label: "Red",     bg: "#dc2626", text: "#ffffff" },
  { id: "yellow",  label: "Yellow",  bg: "#ca8a04", text: "#ffffff" },
  { id: "indigo",  label: "Indigo",  bg: "#4f46e5", text: "#ffffff" },
  { id: "emerald", label: "Emerald", bg: "#059669", text: "#ffffff" },
];

export function getWorkspaceColor(id: string): WorkspaceColor {
  return WORKSPACE_COLORS.find((c) => c.id === id) ?? WORKSPACE_COLORS[0];
}
