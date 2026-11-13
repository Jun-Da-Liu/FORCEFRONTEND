import request from "@/utils/request";

const BASE_URL = "/api/v1/group-id/sku-no-group-id-mapping";

export default {
  getDefault() {
    return request({ url: BASE_URL, method: "get" });
  },
  search(data) {
    return request({ url: `${BASE_URL}/search`, method: "post", data });
  },
  getOneGroupMultiPid() {
    return request({ url: `${BASE_URL}/one-group-multi-pid`, method: "get" });
  },
};
