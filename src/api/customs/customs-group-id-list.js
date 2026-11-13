import request from "@/utils/request";

const BASE_URL = "/api/v1/customs/group-id-9-2-8-list";

// The shared interceptor unwraps only ApiResult responses whose code is "00000".
export default {
  search: (data) => request({ url: `${BASE_URL}/search`, method: "post", data }),
  exportRows: (data) => request({ url: `${BASE_URL}/export`, method: "post", data }),
};
