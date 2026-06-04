import type { ReactNode } from "react";
import { Typography } from "@l4/ui/Typography";

interface SemanticProviderSectionProps {
  title: string;
  description: string;
  error?: string;
  children: ReactNode;
}

export function SemanticProviderSection({
  title,
  description,
  error,
  children,
}: SemanticProviderSectionProps) {
  return (
    <section className="semantic-provider-section" aria-label={title}>
      <div className="semantic-provider-section__header">
        <Typography variant="body" weight={600}>
          {title}
        </Typography>
        <Typography variant="caption" color="var(--color-text-tertiary)">
          {description}
        </Typography>
      </div>
      {children}
      {error && (
        <p className="semantic-provider-section__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
