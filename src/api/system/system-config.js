import request from "@/utils/request";

const BASE_URL = "/api/v1/system/system-config";

// The shared response interceptor accepts only ApiResult.code === "00000".
export default {
  getAll() {
    return request({ url: BASE_URL, method: "get" });
  },
  update(data) {
    return request({ url: BASE_URL, method: "put", data });
  },
};
