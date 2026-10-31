import request from "@/utils/request";

const BASE_URL = "/api/v1/group-id/group-id-replace-mapping";

// The shared interceptor returns data only when ApiResult.code === "00000".
export default {
  search: (data) => request({ url: `${BASE_URL}/search`, method: "post", data }),
  exportRows: (data) => request({ url: `${BASE_URL}/export`, method: "post", data }),
  create: (data) => request({ url: BASE_URL, method: "post", data }),
  update: (id, data) => request({ url: `${BASE_URL}/${id}`, method: "put", data }),
  remove: (id) => request({ url: `${BASE_URL}/${id}`, method: "delete" }),
};
