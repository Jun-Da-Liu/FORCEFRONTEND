import request from "@/utils/request";

const BASE_URL = "/api/v1/fuyu/hfj-aop-pn-mapping";

// The shared interceptor returns data only when ApiResult.code === "00000".
export default {
  getAll() {
    return request({ url: BASE_URL, method: "get" });
  },
  search(data) {
    return request({ url: `${BASE_URL}/search`, method: "post", data });
  },
  create(data) {
    return request({ url: BASE_URL, method: "post", data });
  },
  remove(data) {
    return request({ url: BASE_URL, method: "delete", data });
  },
};
