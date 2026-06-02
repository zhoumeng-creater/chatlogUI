type Unlisten = () => void;

export function createDeferredSubscription(
  setup: () => Promise<Unlisten>,
  onSetupError?: (error: unknown) => void,
): Unlisten {
  let active = true;
  let unlisten: Unlisten | undefined;

  setup()
    .then((fn) => {
      if (active) {
        unlisten = fn;
      } else {
        fn();
      }
    })
    .catch((error) => {
      onSetupError?.(error);
    });

  return () => {
    active = false;
    unlisten?.();
  };
}
