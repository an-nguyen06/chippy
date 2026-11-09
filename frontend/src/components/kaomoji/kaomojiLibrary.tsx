import {useEffect, useState} from "react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {api, getApiError} from "@/lib/api";
interface Entry {_id: string; text: string; categories: string[]}
export function KaomojiLibrary({onSelect, compact = false, disabled = false}: {onSelect?: (text: string) => void; compact?: boolean; disabled?: boolean}) {
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [categories, setCategories] = useState<{name: string; count: number}[]>([]);
    const [items, setItems] = useState<Entry[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [version, setVersion] = useState(0);
    const limit = compact ? 18 : 40;
    useEffect(() => {
        const controller = new AbortController();
        void api.get<{categories: {name: string; count: number}[]}>("/kaomoji/categories", {signal: controller.signal}).then(({data}) => setCategories(data.categories)).catch(() => {});
        return () => controller.abort();
    }, [version]);
    useEffect(() => {
        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setLoading(true); setError("");
            try {
                const {data} = await api.get<{items: Entry[]; total: number}>("/kaomoji", {signal: controller.signal, params: {search, category, page, limit}});
                if (!controller.signal.aborted) {setItems(data.items); setTotal(data.total);}
            } catch (failure) {if (!controller.signal.aborted) setError(getApiError(failure));}
            finally {if (!controller.signal.aborted) setLoading(false);}
        }, 200);
        return () => {clearTimeout(timer); controller.abort();};
    }, [search, category, page, limit, version]);
    async function choose(text: string) {
        if (disabled) return;
        if (onSelect) {onSelect(text); return;}
        try {await navigator.clipboard.writeText(text);}
        catch {toast.error("Couldn't copy. Select the expression to copy it manually.");}
    }
    return <div className={`kaomoji-library ${compact ? "kaomoji-library-compact" : ""}`}>
        <div className="kaomoji-library-filters"><Input aria-label="Search kaomoji or tags" placeholder="Search happy, cat, hug…" value={search} maxLength={80} onChange={(event) => {setSearch(event.target.value); setPage(1); setLoading(true);}} />
        <select aria-label="Kaomoji category" value={category} onChange={(event) => {setCategory(event.target.value); setPage(1); setLoading(true);}}><option value="">All categories</option>{categories.map((item) => <option key={item.name} value={item.name}>{item.name.replaceAll("_", " ")} ({item.count})</option>)}</select></div>
        <p className="chat-muted" role="status">{loading ? "Finding expressions…" : `${total.toLocaleString()} expressions · ${onSelect ? "click to insert" : "click to copy"}`}</p>
        {error ? <div className="friend-request-error" role="alert">{error} <Button type="button" variant="outline" onClick={() => setVersion((value) => value + 1)}>Try again</Button></div> : !loading && !items.length ? <p className="chat-muted">No expressions found. Try another search or category.</p> : <div className="kaomoji-grid" aria-busy={loading}>{!loading && items.map((item) => <button key={item._id} type="button" disabled={disabled} title={item.categories.join(", ")} onClick={() => void choose(item.text)}>{item.text}</button>)}</div>}
        {!loading && !error && total > limit && <div className="friend-request-pagination"><Button type="button" variant="outline" disabled={page === 1} onClick={() => {setPage((value) => value - 1); setLoading(true);}}>Previous</Button><span>{page} / {Math.ceil(total / limit)}</span><Button type="button" variant="outline" disabled={page * limit >= total} onClick={() => {setPage((value) => value + 1); setLoading(true);}}>Next</Button></div>}
        <a className="kaomoji-attribution" href="https://github.com/ekohrt/emoticon_kaomoji_dataset" target="_blank" rel="noreferrer">https://github.com/ekohrt/emoticon_kaomoji_dataset</a>
    </div>;
}
export default KaomojiLibrary;
