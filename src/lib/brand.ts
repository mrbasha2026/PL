// Brand colors and theme configuration for Dealz Tree system

// Primary brand color: Dealz Tree green
export const BRAND_COLORS = {
  primary: '#4CAF50',       // Main green
  primaryDark: '#388E3C',   // Darker green for hover/active
  primaryLight: '#81C784',  // Lighter green for accents
  primaryBg: '#E8F5E9',     // Very light green for backgrounds
  secondary: '#FFC107',     // Amber/gold for accents
  accent: '#0D9488',        // Teal for secondary actions
  danger: '#DC2626',
  warning: '#F59E0B',
  info: '#0891B2',
  success: '#16A34A',
  neutral: '#64748B',
} as const;

// Distinct colors for subsidiaries (cycle through when assigning)
export const SUBSIDIARY_COLORS = [
  '#4CAF50', '#0D9488', '#D97706', '#7C3AED', '#DC2626',
  '#0891B2', '#EA580C', '#DB2777', '#059669', '#4F46E5',
  '#65A30D', '#9333EA', '#0EA5E9', '#F59E0B', '#10B981',
] as const;

export function getSubsidiaryColor(index: number): string {
  return SUBSIDIARY_COLORS[index % SUBSIDIARY_COLORS.length];
}

// CSS custom properties to inject (brand colors)
export const BRAND_CSS_VARS = `
:root {
  --brand-primary: ${BRAND_COLORS.primary};
  --brand-primary-dark: ${BRAND_COLORS.primaryDark};
  --brand-primary-light: ${BRAND_COLORS.primaryLight};
  --brand-primary-bg: ${BRAND_COLORS.primaryBg};
  --brand-secondary: ${BRAND_COLORS.secondary};
  --brand-accent: ${BRAND_COLORS.accent};
}
`;
