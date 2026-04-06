import { useTheme } from "../contexts/ThemeContext";

/**
 * Returns theme-aware CSS classes for admin components.
 * Usage: const t = useAdminTheme();
 * Then use t.surface, t.text, t.muted, t.border, t.input, etc.
 */
export function useAdminTheme() {
  const { isDark } = useTheme();

  return {
    // Backgrounds
    surface: isDark ? "bg-admin-surface" : "bg-white",
    surfaceAlt: isDark ? "bg-admin-surface-alt" : "bg-warm-bg",
    bg: isDark ? "bg-admin-bg" : "bg-warm-bg",

    // Text
    text: isDark ? "text-admin-text" : "text-neutral-text",
    muted: isDark ? "text-admin-muted" : "text-neutral-muted",
    body: isDark ? "text-admin-text/80" : "text-neutral-body",

    // Accent
    accent: isDark ? "text-admin-accent" : "text-gold",
    accentBg: isDark ? "bg-admin-accent" : "bg-gold",

    // Borders
    border: isDark ? "border-admin-surface-alt" : "border-warm-border",
    borderHover: isDark ? "hover:border-admin-accent/40" : "hover:border-gold/40",
    borderFocus: isDark ? "focus:border-admin-accent" : "focus:border-gold",

    // Input field
    input: isDark
      ? "bg-admin-surface-alt border border-admin-surface-alt rounded-lg text-admin-text text-sm outline-none focus:border-admin-accent transition-colors"
      : "bg-warm-bg border border-warm-border rounded-lg text-neutral-text text-sm outline-none focus:border-gold transition-colors",

    // Card
    card: isDark
      ? "bg-admin-surface border border-admin-surface-alt rounded-xl"
      : "bg-white border border-warm-border rounded-xl",

    // Card hover
    cardHover: isDark
      ? "bg-admin-surface border border-admin-surface-alt rounded-xl hover:border-admin-accent/30 transition-colors"
      : "bg-white border border-warm-border rounded-xl hover:border-gold/30 transition-colors",

    // Button primary
    btnPrimary: isDark
      ? "bg-admin-accent text-black font-semibold rounded-lg hover:bg-admin-accent-dark transition-colors"
      : "bg-gold text-onyx font-semibold rounded-lg hover:bg-gold-dark transition-colors",

    // Button secondary
    btnSecondary: isDark
      ? "border border-admin-surface-alt rounded-lg text-admin-muted font-medium hover:border-admin-accent/40 transition-colors"
      : "border border-warm-border rounded-lg text-neutral-body font-medium hover:border-gold/40 transition-colors",

    // Table header
    tableHeader: isDark
      ? "bg-admin-accent/10 border-b border-admin-surface-alt"
      : "bg-warm-bg/50 border-b border-warm-border",

    // Table row odd
    tableRowOdd: isDark ? "bg-admin-surface-alt/30" : "bg-warm-bg/30",

    // Heading label (section labels)
    label: isDark ? "text-admin-muted" : "text-neutral-muted",

    isDark,
  };
}
