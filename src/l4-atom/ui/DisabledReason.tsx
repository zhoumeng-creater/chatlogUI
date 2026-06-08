import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import { classNames } from "@/utils/classNames";

export type DisabledReasonVariant = "sr-only" | "inline" | "compact";

interface DisabledReasonProps {
  id?: string;
  reason: ReactNode;
  variant?: DisabledReasonVariant;
  className?: string;
  children?: ReactNode;
}

interface DescribedElementProps {
  "aria-describedby"?: string;
}

export function DisabledReason({
  id,
  reason,
  variant = "sr-only",
  className = "",
  children,
}: DisabledReasonProps) {
  const generatedId = useId().replace(/:/g, "");
  const reasonId = id ?? `disabled-reason-${generatedId}`;
  const describedChild = getDescribedChild(children, reasonId);

  return (
    <>
      {describedChild}
      <span
        id={reasonId}
        className={classNames(
          "ui-disabled-reason",
          `ui-disabled-reason--${variant}`,
          variant === "sr-only" && "sr-only",
          className,
        )}
      >
        {reason}
      </span>
    </>
  );
}

function getDescribedChild(children: ReactNode, reasonId: string): ReactNode {
  if (!isValidElement(children)) return children;

  const existingDescription = (children.props as DescribedElementProps)["aria-describedby"];
  const existingIds = existingDescription?.split(/\s+/).filter(Boolean) ?? [];
  const descriptionIds = existingIds.includes(reasonId)
    ? existingIds.join(" ")
    : [...existingIds, reasonId].join(" ");

  return cloneElement(children as ReactElement<DescribedElementProps>, {
    "aria-describedby": descriptionIds,
  });
}
