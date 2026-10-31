import request from "@/utils/request";

const BASE_URL = "/api/v1/system/system-jobs-manage";

// The shared response interceptor accepts only ApiResult.code === "00000" and returns data.
export default {
  getPage() {
    return request({ url: BASE_URL, method: "get" });
  },
  add(data) {
    return request({ url: BASE_URL, method: "post", data });
  },
  updateDescription(data) {
    return request({ url: `${BASE_URL}/description`, method: "put", data });
  },
  setStatus(data) {
    return request({ url: `${BASE_URL}/status`, method: "put", data });
  },
};
