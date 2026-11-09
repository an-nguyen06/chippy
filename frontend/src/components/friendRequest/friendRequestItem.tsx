import { useEffect, useState } from "react";
import { Mail, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, getApiError } from "@/lib/api";

export interface FriendRequest {
  _id: string;
  sender: { _id: string; username: string; displayName: string; avatarUrl?: string } | null;
  recipient: { _id: string; username: string; displayName: string; avatarUrl?: string } | null;
  createdAt: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
}
type Direction = "incoming" | "outgoing";

export function FriendRequestItem({request, direction, onChanged}: {request: FriendRequest; direction: Direction; onChanged: () => void}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const person = direction === "incoming" ? request.sender : request.recipient;
  async function act(action: "accept" | "reject" | "cancel") {
    if (pending) return;
    setPending(true); setError("");
    try {
      await api.patch(`/friends/requests/${request._id}/${action}`);
      onChanged();
    } catch (failure) {setError(getApiError(failure));}
    finally {setPending(false);}
  }
  return <li className="friend-request-card">
    <div className="friend-request-person">
      <span className="chippy-avatar">{person?.avatarUrl ? <img src={person.avatarUrl} alt="" /> : <UserRound size={18} />}</span>
      <div><strong>{person?.displayName || "Deleted user"}</strong><p>{person ? `@${person.username}` : "This account is no longer available."}</p></div>
      {direction === "incoming" && <span className="friend-request-status">a new hello</span>}
    </div>
    <div className="friend-request-bottom">
      <time dateTime={request.createdAt}>{new Date(request.createdAt).toLocaleDateString(undefined, {month: "short", day: "numeric", year: "numeric"})}</time>
      <div className="friend-request-actions">
        {direction === "incoming" ? <><Button disabled={pending || !person} onClick={() => void act("accept")}>{pending ? "Updating…" : "Accept"}</Button><Button variant="outline" disabled={pending} onClick={() => void act("reject")}>Decline</Button></> : <Button variant="outline" disabled={pending} onClick={() => void act("cancel")}>{pending ? "Cancelling…" : "Cancel request"}</Button>}
      </div>
    </div>
    {error && <p className="friend-request-error" role="alert">{error}</p>}
  </li>;
}

export function FriendRequestList({direction, onChanged, refreshKey = 0}: {direction: Direction; onChanged?: () => void; refreshKey?: number}) {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const limit = 20;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError("");
      try {
        const {data} = await api.get<{requests: FriendRequest[]; total: number}>("/friends/requests", {signal: controller.signal, params: {direction, status: "pending", page, limit}});
        if (controller.signal.aborted) return;
        const lastPage = Math.max(1, Math.ceil(data.total / limit));
        if (page > lastPage) {setPage(lastPage); return;}
        setRequests(data.requests); setTotal(data.total);
      } catch (failure) {if (!controller.signal.aborted) setError(getApiError(failure));}
      finally {if (!controller.signal.aborted) setLoading(false);}
    }
    void load();
    return () => controller.abort();
  }, [direction, page, version, refreshKey]);
  function changed() {setVersion((value) => value + 1); onChanged?.();}
  return <section aria-label={direction === "incoming" ? "Received requests" : "Sent requests"} aria-busy={loading}>
    {loading ? <p className="chat-muted" role="status">Opening your letters…</p> : error ? <div className="friend-request-error" role="alert">{error} <Button variant="outline" onClick={() => setVersion((value) => value + 1)}>Try again</Button></div> : <>
      {requests.length ? <ul className="friend-request-list">{requests.map((request) => <FriendRequestItem key={request._id} request={request} direction={direction} onChanged={changed} />)}</ul> : <div className="chat-empty"><Mail /><p>{direction === "incoming" ? "No introductions waiting." : "No letters on their way."}</p><span>{direction === "incoming" ? "New friend requests will arrive here." : "Send a friend request to start a new connection."}</span></div>}
      {total > limit && <div className="friend-request-pagination"><Button variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span>Page {page} of {Math.ceil(total / limit)}</span><Button variant="outline" disabled={page * limit >= total} onClick={() => setPage((value) => value + 1)}>Next</Button></div>}
    </>}
  </section>;
}
