import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";

export function ReadinessChecklist() {
  const profile = useSetupStore((s) => s.profile);
  const httpReady = useSetupStore((s) => s.httpReady);
  const dbReady = useSetupStore((s) => s.dbReady);

  const items = [
    { label: "配置已保存", done: profile !== null },
    { label: "HTTP 服务健康", done: httpReady },
    { label: "数据库就绪", done: dbReady },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-700">就绪检查</h3>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            <span
              className={`flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                item.done ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
              }`}
              aria-hidden="true"
            >
              {item.done ? "\u2713" : "\u2014"}
            </span>
            <span className={item.done ? "text-gray-700" : "text-gray-400"}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
