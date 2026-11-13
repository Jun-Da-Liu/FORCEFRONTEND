import request from "@/utils/request";

const BASE_URL = "/api/v1/customs/mpn-upload";

export default {
  search(params = {}) {
    return request({ url: BASE_URL, method: "get", params });
  },
};
