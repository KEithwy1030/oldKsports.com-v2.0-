import { useEffect, useRef } from 'react';

// 统一管理组件挂载状态与可取消请求的 Hook
export function useMountedSignal() {
  const isMountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 获取一个新的 signal，并自动取消上一请求
  const nextSignal = () => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (_) {}
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    return controller.signal;
  };

  // 取消当前未完成请求
  const cancelPending = () => {
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch (_) {}
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancelPending();
    };
  }, []);

  return { isMountedRef, nextSignal, cancelPending } as const;
}


