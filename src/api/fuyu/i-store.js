import request from "@/utils/request";

const BASE_URL = "/api/v1/fuyu/i-store";

// The shared interceptor checks code === "00000" and returns data, rejecting failures.
export default {
  getList() {
    return request({ url: BASE_URL, method: "get" });
  },
  search(data) {
    return request({ url: `${BASE_URL}/search`, method: "post", data });
  },
};
