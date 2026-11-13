import request from "@/utils/request";

const BASE_URL = "/api/v1/report-search/search-wo-group-id-reg";

// The shared interceptor returns data only when ApiResult.code === "00000".
export default {
  search(data) {
    return request({ url: `${BASE_URL}/search`, method: "post", data });
  },
  exportRows(data) {
    return request({ url: `${BASE_URL}/export`, method: "post", data });
  },
};
