import API from "./axios";

export const authAPI = {
  login: async (data) => {
    const res = await API.post("api/token/", data);
    localStorage.setItem("token", res.data.access);
    return res.data;
  },
};