import request from "@/utils/request";

const BASE_URL = "/api/v1/report-search/warehouse-code-mapping";

// The shared response interceptor returns data only when ApiResult.code === "00000".
export default {
  getAll() {
    return request({ url: BASE_URL, method: "get" });
  },
  create(payload) {
    return request({ url: BASE_URL, method: "post", data: payload });
  },
  update(id, payload) {
    return request({ url: `${BASE_URL}/${id}`, method: "put", data: payload });
  },
  remove(id) {
    return request({ url: `${BASE_URL}/${id}`, method: "delete" });
  },
};
