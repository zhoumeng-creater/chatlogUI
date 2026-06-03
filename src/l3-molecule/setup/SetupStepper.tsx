import type { SetupStepId } from "@l2/data-clerk/types/setup";
import { classNames } from "@/utils/classNames";

const STEP_LABELS: Record<SetupStepId, string> = {
  mode: "模式",
  config: "配置",
  service: "服务",
  database: "数据库",
  ready: "完成",
};

const STEP_ORDER: SetupStepId[] = ["mode", "config", "service", "database", "ready"];

interface SetupStepperProps {
  currentStep: SetupStepId;
}

export function SetupStepper({ currentStep }: SetupStepperProps) {
  return (
    <nav aria-label="设置步骤" className="flex flex-col gap-1">
      {STEP_ORDER.map((stepId, idx) => {
        const stepIdx = STEP_ORDER.indexOf(currentStep);
        const isCurrent = stepId === currentStep;
        const isDone = stepIdx > STEP_ORDER.indexOf(stepId);

        return (
          <div
            key={stepId}
            className={classNames(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              isCurrent
                ? "bg-blue-50 text-blue-700 font-medium"
                : isDone
                  ? "text-gray-500"
                  : "text-gray-400",
            )}
          >
            <span
              className={classNames(
                "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                isDone
                  ? "bg-green-100 text-green-600"
                  : isCurrent
                    ? "bg-blue-100 text-blue-600"
                    : "bg-gray-100 text-gray-400",
              )}
              aria-hidden="true"
            >
              {isDone ? "\u2713" : idx + 1}
            </span>
            <span>{STEP_LABELS[stepId]}</span>
          </div>
        );
      })}
    </nav>
  );
}
