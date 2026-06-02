interface TooltipInput {
  title: string;
  body: string;
}

interface TimelineInput {
  title: string;
  source: string;
  description: string;
}

export function getGraphNodeLabel(value: string, privacyOn: boolean): string {
  return displayText(value, privacyOn, "Unknown node");
}

export function getGraphRelationLabel(value: string, privacyOn: boolean): string {
  return displayText(value, privacyOn, "Unknown relation");
}

export function getGraphTooltipDisplay(
  input: TooltipInput,
  privacyOn: boolean,
): TooltipInput {
  return {
    title: displayText(input.title, privacyOn, "Unknown node"),
    body: displayText(input.body, privacyOn, ""),
  };
}

export function getGraphTimelineDisplay(
  input: TimelineInput,
  privacyOn: boolean,
): TimelineInput {
  return {
    title: displayText(input.title, privacyOn, "Untitled event"),
    source: displayText(input.source, privacyOn, ""),
    description: displayText(input.description, privacyOn, ""),
  };
}

function displayText(value: string, privacyOn: boolean, fallback: string): string {
  const text = value.trim() || fallback;
  return privacyOn ? text.replace(/[^\s]/g, "*") : text;
}
