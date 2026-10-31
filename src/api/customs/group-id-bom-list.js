import request from "@/utils/request";

const BASE_URL = "/api/v1/customs/group-id-bom-list";

// The shared interceptor returns data only when ApiResult.code === "00000".
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
