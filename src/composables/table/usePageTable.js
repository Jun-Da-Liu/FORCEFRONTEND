import { reactive, ref } from "vue";

/** Shared pagination state used by the existing oldPage views. */
export function usePageTable({ initialParams = {}, request, onBeforeReset } = {}) {
  const defaults = { ...initialParams };
  const params = reactive({ ...defaults });
  const loading = ref(false);
  const list = ref([]);
  const total = ref(0);

  async function fetchData() {
    if (loading.value) return;
    loading.value = true;
    try {
      const response = await request({ ...params });
      const page = response?.data ?? response;
      const records = page?.list ?? page?.records ?? page?.items ?? page?.rows ?? [];
      list.value = Array.isArray(records) ? records : [];
      total.value = Number(page?.total ?? page?.rowCount ?? list.value.length);
    } finally {
      loading.value = false;
    }
  }

  function handleQuery() {
    params.pageNum = 1;
    return fetchData();
  }

  function handleResetQuery() {
    onBeforeReset?.();
    Object.keys(params).forEach((key) => {
      if (!(key in defaults)) delete params[key];
    });
    Object.assign(params, defaults);
    return handleQuery();
  }

  return { loading, list, total, params, fetchData, handleQuery, handleResetQuery };
}
