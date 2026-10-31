import request from "@/utils/request";

const BASE_URL = "/api/v1/group-id/search-group-id";

export default {
  getDefault() {
    return request({ url: BASE_URL, method: "get" });
  },
  search(data) {
    return request({ url: `${BASE_URL}/search`, method: "post", data });
  },
  getParts(params) {
    return request({ url: `${BASE_URL}/parts`, method: "get", params });
  },
  getDetail(groupId) {
    return request({ url: `${BASE_URL}/detail`, method: "get", params: { groupId } });
  },
};
