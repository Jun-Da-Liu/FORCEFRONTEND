import request from "@/utils/request";

const BASE_URL = "/api/v1/report-search/invoice-no-work-order-no-mapping";

// The shared interceptor accepts only ApiResult.code === "00000" and returns data.
export default {
  getDefault() {
    return request({ url: BASE_URL, method: "get" });
  },
  search(data) {
    return request({ url: `${BASE_URL}/search`, method: "post", data });
  },
};
