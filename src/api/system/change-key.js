import request from "@/utils/request";

const BASE_URL = "/api/v1/system/change-key";

// The shared response interceptor accepts only ApiResult.code === "00000".
export default {
  change(data) {
    return request({ url: BASE_URL, method: "put", data });
  },
};
