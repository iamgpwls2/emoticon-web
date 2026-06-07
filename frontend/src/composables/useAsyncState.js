import { ref } from 'vue';
import { toUserErrorMessage } from '../utils/apiError.js';

/**
 * 비동기 작업의 loading / error / success 상태를 공통으로 관리합니다.
 * @param {{ fallbackError?: string }} [options]
 */
export function useAsyncState(options = {}) {
  const loading = ref(false);
  const error = ref('');
  const success = ref(false);
  const successMessage = ref('');

  function clearError() {
    error.value = '';
  }

  function clearSuccess() {
    success.value = false;
    successMessage.value = '';
  }

  function reset() {
    loading.value = false;
    error.value = '';
    success.value = false;
    successMessage.value = '';
  }

  /**
   * @template T
   * @param {() => Promise<T>} task
   * @param {{
   *   successMessage?: string,
   *   onSuccess?: (result: T) => void,
   *   fallbackError?: string,
   * }} [runOptions]
   * @returns {Promise<T|undefined>}
   */
  async function run(task, runOptions = {}) {
    if (loading.value) {
      return undefined;
    }

    loading.value = true;
    error.value = '';
    success.value = false;
    successMessage.value = '';

    try {
      const result = await task();
      success.value = true;
      if (runOptions.successMessage) {
        successMessage.value = runOptions.successMessage;
      }
      runOptions.onSuccess?.(result);
      return result;
    } catch (err) {
      error.value = toUserErrorMessage(
        err,
        runOptions.fallbackError ||
          options.fallbackError ||
          '요청에 실패했습니다. 다시 시도해 주세요.'
      );
      return undefined;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    success,
    successMessage,
    clearError,
    clearSuccess,
    reset,
    run,
  };
}
