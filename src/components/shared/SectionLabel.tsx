/**
 * SectionLabel — label uppercase amber utilisé en tête de chaque section
 * du design system vitrine Atlas Studio.
 */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        letterSpacing: '2px',
        textTransform: 'uppercase',
        color: '#EF9F27',
        fontWeight: 500,
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}
