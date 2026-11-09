import { FriendRequestList } from "./friendRequestItem";

export function SentRequest({onChanged, refreshKey}: {onChanged?: () => void; refreshKey?: number}) {
  return <FriendRequestList direction="outgoing" onChanged={onChanged} refreshKey={refreshKey} />;
}
export default SentRequest;
