import request from "@/utils/request";

const BASE_URL = "/api/v1/system/admin-group-info";

// The shared interceptor unwraps ApiResult only when code is "00000".
export default {
  getPage: () => request({ url: BASE_URL, method: "get" }),
  getBindings: (groupId) => request({ url: `${BASE_URL}/${groupId}/bindings`, method: "get" }),
  add: (data) => request({ url: BASE_URL, method: "post", data }),
  update: (data) => request({ url: BASE_URL, method: "put", data }),
};
