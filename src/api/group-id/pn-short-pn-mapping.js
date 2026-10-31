import request from "@/utils/request";

const BASE_URL = "/api/v1/group-id/pn-short-pn-mapping";

// The shared interceptor unwraps only ApiResult responses whose code is "00000".
export default {
  query: (params) => request({ url: BASE_URL, method: "get", params }),
  create: (data) => request({ url: BASE_URL, method: "post", data }),
  update: (id, data) => request({ url: `${BASE_URL}/${id}`, method: "put", data }),
  remove: (id) => request({ url: `${BASE_URL}/${id}`, method: "delete" }),
};
