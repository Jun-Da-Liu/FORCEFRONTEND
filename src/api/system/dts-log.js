import request from "@/utils/request";

const BASE_URL = "/api/v1/system/dts-log";

export default {
  getNames() {
    return request({ url: `${BASE_URL}/names`, method: "get" });
  },
  search(params) {
    return request({ url: BASE_URL, method: "get", params });
  },
};
