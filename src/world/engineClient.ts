export function engineRequest<T>(
  payload: Record<string, unknown>,
  signal?: AbortSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./engine.worker.ts", import.meta.url), {
      type: "module",
    });
    const timeout = setTimeout(() => {
      cleanup();
      reject(
        new Error("Analysis took too long. Try again.")
      );
    }, 90000);
    const cleanup = () => {
      clearTimeout(timeout);
      worker.terminate();
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      cleanup();
      reject(new DOMException("Cancelled", "AbortError"));
    };
    if (signal?.aborted) {
      abort();
      return;
    }
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = ({ data }) => {
      cleanup();
      data.error ? reject(new Error(data.error)) : resolve(data.result);
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error("Could not start the chess engine."));
    };
    worker.postMessage({ ...payload, id: 1 });
  });
}
