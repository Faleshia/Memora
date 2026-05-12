import API from "./axios";

export const notesAPI = {
  getAll: async () => {
    const res = await API.get("api/notes/");
    return res.data;
  },

  create: async (data) => {
    const res = await API.post("api/notes/", data);
    return res.data;
  },

  update: async (id, data) => {
    const res = await API.put(`api/notes/${id}/`, data);
    return res.data;
  },

  delete: async (id) => {
    await API.delete(`api/notes/${id}/`);
  },
};

export const getAll = async () => {
  const res = await API.get("api/notes/");
  return res.data;
};