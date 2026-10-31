import request from "@/utils/request";

const BASE_URL = "/api/v1/customs/customs-shipping-mail-list";

// The shared response interceptor accepts only ApiResult.code === "00000".
export default {
  get() {
    return request({ url: BASE_URL, method: "get" });
  },
  update(data) {
    return request({ url: BASE_URL, method: "put", data });
  },
};
