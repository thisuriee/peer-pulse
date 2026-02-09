import API from "./axios-client";

export const loginMutationFn = async (data) =>
  await API.post(`/auth/login`, data);

export const registerMutationFn = async (data) =>
  await API.post(`/auth/register`, data);

export const verifyEmailMutationFn = async (data) =>
  await API.post(`/auth/verify/email`, data);

export const forgotPasswordMutationFn = async (data) =>
  await API.post(`/auth/password/forgot`, data);

export const resetPasswordMutationFn = async (data) =>
  await API.post(`/auth/password/reset`, data);

export const verifyMFAMutationFn = async (data) =>
  await API.post(`/mfa/verify`, data);

export const verifyMFALoginMutationFn = async (data) =>
  await API.post(`/mfa/verify-login`, data);

export const logoutMutationFn = async () => await API.post(`/auth/logout`);

export const mfaSetupQueryFn = async () => {
  const response = await API.get(`/mfa/setup`);
  return response.data;
};
export const revokeMFAMutationFn = async () => await API.put(`/mfa/revoke`, {});

export const getUserSessionQueryFn = async () => await API.get(`/session/`);

export const sessionsQueryFn = async () => {
  const response = await API.get(`/session/all`);
  return response.data;
};

export const sessionDelMutationFn = async (id) =>
  await API.delete(`/session/${id}`);
