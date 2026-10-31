import request from "@/utils/request";

const BASE_URL = "/api/v1/group-id/update-part-no";

// The shared interceptor unwraps only ApiResult responses whose code is "00000".
export default {
  getAll: () => request({ url: BASE_URL, method: "get" }),
  create: (data) => request({ url: BASE_URL, method: "post", data }),
  update: (id, data) => request({ url: `${BASE_URL}/${id}`, method: "put", data }),
};
