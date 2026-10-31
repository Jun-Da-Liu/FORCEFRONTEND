import request from "@/utils/request";

const BASE_URL = "/api/v1/group-id/volume-no-mapping";

// request.js unwraps only successful ApiResult responses (code === "00000").
export default {
  getAll: () => request({ url: BASE_URL, method: "get" }),
  createCorporation: (data) => request({ url: `${BASE_URL}/corporations`, method: "post", data }),
  createVolume: (data) => request({ url: `${BASE_URL}/volumes`, method: "post", data }),
  createBusinessUnit: (data) =>
    request({ url: `${BASE_URL}/business-units`, method: "post", data }),
  remove: (entity, id) => request({ url: `${BASE_URL}/${entity}/${id}`, method: "delete" }),
};
