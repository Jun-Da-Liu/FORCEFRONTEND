import request from "@/utils/request";

const BASE_URL = "/api/v1/report-search/search-sap-sfc-check-group-id-point";

// The shared response interceptor accepts only ApiResult.code === "00000".
export default {
  getInitial() {
    return request({ url: BASE_URL, method: "get" });
  },
  search(data) {
    return request({ url: `${BASE_URL}/search`, method: "post", data });
  },
  exportRows(data) {
    return request({ url: `${BASE_URL}/export`, method: "post", data });
  },
};
