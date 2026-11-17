import { useState } from "react";
import { Bell, BellRing, Trash2, Volume2, VolumeX, ArrowUp, ArrowDown, Send } from "lucide-react";
import { toast } from "sonner";
import { fmtPrice } from "../../lib/api";
import { enablePush, pushSupported } from "../../lib/notify";
import { http } from "../../lib/api";

export default function AlarmsPanel({ alarms, symMap, onDelete, onClear, sound, setSound, onSelect }) {
  const [pushOn, setPushOn] = useState(pushSupported() && Notification.permission === "granted");
  const active = alarms.filter((a) => a.status === "active");
  const done = alarms.filter((a) => a.status === "triggered");
  const turnOn = async () => {
    try { await enablePush(); setPushOn(true); toast.success("Push bildirimleri açıldı"); }
    catch (e) { toast.error(e.message || "Push açılamadı"); }
  };
  const row = (a) => {
    const p = symMap[a.symbol]?.precision ?? 2;
    return (
      <div key={a.id} className="group flex items-center gap-2 px-2 h-8 hover:bg-white/5 cursor-pointer text-[11px]" onClick={() => onSelect(a.symbol)} data-testid={`alarm-row-${a.id}`}>
        {a.status === "active" ? <Bell size={12} className="text-[#F5A623]" /> : <BellRing size={12} className="text-[#787B86]" />}
        <span className="font-semibold text-[#E0E3EB] w-24 truncate">{a.symbol}</span>
        {a.direction === "up" ? <ArrowUp size={11} className="text-[#089981]" /> : <ArrowDown size={11} className="text-[#F23645]" />}
        <span className="font-mono-num text-[#E0E3EB] flex-1 text-right">{fmtPrice(a.price, p)}</span>
        {a.status === "triggered" && <span className="font-mono-num text-[10px] text-[#787B86]">{new Date(a.triggered_at).toLocaleTimeString("tr-TR")}</span>}
        <button onClick={(e) => { e.stopPropagation(); onDelete(a.id); }} className="opacity-60 group-hover:opacity-100 text-[#787B86] hover:text-[#F23645]" data-testid={`alarm-delete-${a.id}`}><Trash2 size={12} /></button>
      </div>
    );
  };
  return (
    <div className="h-full flex flex-col" data-testid="alarms-panel">
      <div className="flex items-center gap-1 px-2 h-8 border-b border-white/[0.06] shrink-0">
        <button onClick={() => setSound(!sound)} className={`h-6 px-1.5 flex items-center gap-1 text-[10px] rounded-sm ${sound ? "text-[#E0E3EB]" : "text-[#787B86]"} hover:bg-white/5`} data-testid="alarm-sound-toggle">
          {sound ? <Volume2 size={12} /> : <VolumeX size={12} />} Ses
        </button>
        {pushOn ? (
          <button onClick={() => http.post("/push/test").then(() => toast("Test bildirimi gönderildi"))} className="h-6 px-1.5 flex items-center gap-1 text-[10px] text-[#089981] hover:bg-white/5 rounded-sm" data-testid="push-test-button"><Send size={11} /> Push aktif · test</button>
        ) : (
          <button onClick={turnOn} className="h-6 px-1.5 flex items-center gap-1 text-[10px] text-white hover:bg-white/5 rounded-sm" data-testid="push-enable-button"><BellRing size={11} /> Push aç</button>
        )}
        <div className="flex-1" />
        {done.length > 0 && <button onClick={onClear} className="text-[10px] text-[#787B86] hover:text-[#F23645]" data-testid="alarm-clear-triggered">Geçmişi temizle</button>}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {active.length === 0 && (
          <div className="px-3 py-3 text-[11px] text-[#787B86] leading-relaxed" data-testid="alarms-empty">
            Aktif alarm yok. Grafikte fiyat ölçeğinin yanında beliren <span className="inline-flex h-4 w-4 items-center justify-center bg-[#D1D4DC] text-black rounded-sm align-middle">+</span> ile alarm ekleyin.
          </div>
        )}
        {active.map(row)}
        {done.length > 0 && <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wider text-[#434651]">Tetiklenenler</div>}
        {done.map(row)}
      </div>
    </div>
  );
}
