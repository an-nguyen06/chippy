import { api } from "@/lib/api";
import { useAuthStore, type AuthUser } from "@/stores/auth-store";
export type ProfileChanges = Partial<Pick<AuthUser, "displayName" | "bio" | "phone" | "avatarUrl" | "preferences" | "privacy">>;
export async function saveProfile(changes: ProfileChanges) {
  const userId = useAuthStore.getState().user?._id;
  const {data} = await api.patch<{user: AuthUser}>("/users/me", changes);
  if (useAuthStore.getState().user?._id === userId) useAuthStore.setState({user: data.user});
  return data.user;
}
