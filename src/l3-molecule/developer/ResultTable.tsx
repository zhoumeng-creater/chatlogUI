import { Typography } from "@l4/ui";
import type { AdaptedDbRowsTable } from "@l4/network";

interface ResultTableProps {
  table: AdaptedDbRowsTable;
  emptyCopy: string;
}

export function ResultTable({ table, emptyCopy }: ResultTableProps) {
  if (table.rows.length === 0 || table.columns.length === 0) {
    return (
      <div className="developer-empty-inline">
        <Typography variant="caption" color="var(--text-secondary)">
          {emptyCopy}
        </Typography>
      </div>
    );
  }

  const columns = table.columns.slice(0, 8);
  const rows = table.rows.slice(0, 24);

  return (
    <div className="developer-table" role="table" aria-label="数据库结果">
      <div className="developer-table__row developer-table__row--head" role="row">
        {columns.map((column) => (
          <span key={column} role="columnheader">
            {column}
          </span>
        ))}
      </div>
      {rows.map((row) => (
        <div key={row.id} className="developer-table__row" role="row">
          {columns.map((column) => (
            <span key={column} role="cell">
              {row.cells[column] ?? ""}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
