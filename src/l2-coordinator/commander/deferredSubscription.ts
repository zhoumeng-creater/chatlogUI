type Unlisten = () => void;

export function createDeferredSubscription(setup: () => Promise<Unlisten>): Unlisten {
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
      console.error("订阅初始化失败:", error);
    });

  return () => {
    active = false;
    unlisten?.();
  };
}
