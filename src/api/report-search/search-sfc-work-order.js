import request from "@/utils/request";

const BASE_URL = "/api/v1/report-search/search-sfc-work-order";

// The shared interceptor returns data only when ApiResult.code === "00000".
export default {
  search(data) {
    return request({ url: `${BASE_URL}/search`, method: "post", data });
  },
};
