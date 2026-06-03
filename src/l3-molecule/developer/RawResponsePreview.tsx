import { Copy, FileJson } from "lucide-react";
import { Button, Typography } from "@l4/ui";

interface RawResponsePreviewProps {
  title: string;
  preview: string;
  emptyCopy: string;
}

export function RawResponsePreview({ title, preview, emptyCopy }: RawResponsePreviewProps) {
  return (
    <div className="developer-preview" aria-label={title}>
      <div className="developer-preview__title">
        <div className="developer-preview__label">
          <FileJson size={14} />
          <Typography variant="label" weight={700}>
            {title}
          </Typography>
        </div>
        {preview && (
          <Button
            variant="ghost"
            size="sm"
            aria-label="复制脱敏响应"
            onClick={() => {
              void globalThis.navigator?.clipboard?.writeText(preview);
            }}
          >
            <Copy size={14} />
          </Button>
        )}
      </div>
      {preview ? (
        <pre className="developer-preview__body">{preview}</pre>
      ) : (
        <Typography variant="caption" color="var(--text-secondary)">
          {emptyCopy}
        </Typography>
      )}
    </div>
  );
}
