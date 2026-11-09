import { FriendRequestList } from "./friendRequestItem";

export function ReceivedRequest({onChanged, refreshKey}: {onChanged?: () => void; refreshKey?: number}) {
  return <FriendRequestList direction="incoming" onChanged={onChanged} refreshKey={refreshKey} />;
}
export default ReceivedRequest;
