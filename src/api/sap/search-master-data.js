import request from "@/utils/request";

const BASE_URL = "/api/v1/sap/search-master-data";

// The shared response interceptor accepts only ApiResult.code === "00000".
export default {
  getDefault() {
    return request({ url: BASE_URL, method: "get" });
  },
  search(data) {
    return request({ url: `${BASE_URL}/search`, method: "post", data });
  },
};
