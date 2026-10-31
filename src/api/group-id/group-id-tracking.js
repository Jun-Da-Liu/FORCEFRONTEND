import request from "@/utils/request";

const BASE_URL = "/api/v1/group-id/group-id-tracking";

// The shared interceptor returns data only when ApiResult.code === "00000".
export default {
  getInitial: () => request({ url: BASE_URL, method: "get" }),
  search: (data) => request({ url: `${BASE_URL}/search`, method: "post", data }),
  getDetail: (groupId) =>
    request({ url: `${BASE_URL}/${encodeURIComponent(groupId)}/detail`, method: "get" }),
};
