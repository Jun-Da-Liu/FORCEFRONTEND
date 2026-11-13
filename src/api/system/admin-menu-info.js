import request from "@/utils/request";

const BASE_URL = "/api/v1/system/admin-menu-info";

// The shared response interceptor accepts only ApiResult.code === "00000" and returns data.
export default {
  getPage() {
    return request({ url: BASE_URL, method: "get" });
  },
  add(data) {
    return request({ url: BASE_URL, method: "post", data });
  },
  update(data) {
    return request({ url: BASE_URL, method: "put", data });
  },
  reorder(nodeIds) {
    return request({ url: `${BASE_URL}/sort`, method: "put", data: { nodeIds } });
  },
};
