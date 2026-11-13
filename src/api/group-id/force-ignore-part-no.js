import request from "@/utils/request";

const BASE_URL = "/api/v1/group-id/force-ignore-part-no";

// The shared interceptor returns data only when ApiResult.code === "00000".
export default {
  getAll() {
    return request({ url: BASE_URL, method: "get" });
  },
  create(data) {
    return request({ url: BASE_URL, method: "post", data });
  },
  update(id, data) {
    return request({ url: `${BASE_URL}/${id}`, method: "put", data });
  },
  remove(id) {
    return request({ url: `${BASE_URL}/${id}`, method: "delete" });
  },
};
