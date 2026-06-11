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
    <nav aria-label="设置步骤" className="setup-stepper">
      {STEP_ORDER.map((stepId, idx) => {
        const stepIdx = STEP_ORDER.indexOf(currentStep);
        const isCurrent = stepId === currentStep;
        const isDone = stepIdx > STEP_ORDER.indexOf(stepId);

        return (
          <div
            key={stepId}
            aria-current={isCurrent ? "step" : undefined}
            className={classNames(
              "setup-stepper__item",
              isCurrent && "setup-stepper__item--current",
              isDone && "setup-stepper__item--done",
            )}
          >
            <span
              className={classNames(
                "setup-stepper__index",
                isDone && "setup-stepper__index--done",
                isCurrent && "setup-stepper__index--current",
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
