import { useMemo, useRef, useState } from "react";

/**
 * Central Kitting Station — Professional UI update
 * - Primary color: #d44b28
 * - Bigger title + subtitle
 * - Centered layout (no big empty right side)
 * - LR orders show L + R examples
 * - Removed extra note text
 */

const LOGIN_PIN = "2059";
const USER_NAME = "Mustaf Abtidon";
const AUTH_KEY = "demo_auth_v1";

const APP_TITLE = "Central Kitting Station";
const APP_SUBTITLE = "Order ID → Validate → Consume → Scan Tracker QR";

const THEME = {
  brand: "#d44b28",
  brand2: "#e0633f",
  bg: "#F8FAFC",
  text: "#0F172A",
  muted: "#475569",
  border: "#E2E8F0",
  card: "#FFFFFF",
  good: "#16A34A",
  bad: "#DC2626",
};

const APP_WIDTH = 760;

const SHELL_STYLE = {
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  background: THEME.bg,
};

const SAMPLE_ORDER_RULES = {
  "1122": {
    orderId: "1122",
    needs: {
      hearingAid: { qty: 1, model: "RU960", side: "L" },
      receiver: { qty: 1, type: "M", side: "L", length: "2" },
    },
  },
  "4400": {
    orderId: "4400",
    needs: {
      hearingAid: { qty: 1, model: "RE960", side: "L" },
      receiver: { qty: 0 },
    },
  },
  "5500": {
    orderId: "5500",
    needs: {
      hearingAid: { qty: 2, model: "RT960", side: "LR" },
      receiver: { qty: 0 },
    },
  },
  "2201": {
    orderId: "2201",
    needs: {
      hearingAid: { qty: 2, model: "IM960", side: "LR" },
      receiver: { qty: 2, type: "P", side: "LR", length: "1" },
    },
  },
};

function normalize(v) {
  return (v || "").trim();
}
function normalizeTracker(v) {
  const raw = normalize(v);
  if (!raw) return "";
  return raw.toUpperCase().startsWith("OT-") ? raw.toUpperCase() : `OT-${raw.toUpperCase()}`;
}
function addUnique(list, value) {
  if (!value) return list;
  if (list.includes(value)) return list;
  return [...list, value];
}
function removeItem(list, value) {
  return list.filter((x) => x !== value);
}

/** Parsers:
 * HA-<MODEL>-<SIDE>-<SERIAL>  ex: HA-RU960-L-90001
 * RX-<TYPE>-<SIDE>-<LEN>-<SERIAL> ex: RX-M-L-2-99123
 */
function parseHA(s) {
  const parts = s.split("-");
  if (parts.length < 4 || parts[0] !== "HA") return null;
  return { model: parts[1]?.toUpperCase(), side: parts[2]?.toUpperCase(), raw: s };
}
function parseRX(s) {
  const parts = s.split("-");
  if (parts.length < 5 || parts[0] !== "RX") return null;
  return { type: parts[1]?.toUpperCase(), side: parts[2]?.toUpperCase(), length: parts[3], raw: s };
}
function sideAllowed(ruleSide, itemSide) {
  if (!ruleSide) return true;
  const rs = ruleSide.toUpperCase();
  const is = itemSide?.toUpperCase();
  if (rs === "LR") return is === "L" || is === "R";
  return rs === is;
}

function haExamplesForOrder(order) {
  if (!order) return ["HA-RU960-L-90001"];
  const m = (order.needs?.hearingAid?.model || "RU960").toUpperCase();
  const side = (order.needs?.hearingAid?.side || "L").toUpperCase();
  const qty = order.needs?.hearingAid?.qty ?? 1;

  if (qty === 2 && side === "LR") return [`HA-${m}-L-90001`, `HA-${m}-R-90002`];
  const oneSide = side === "LR" ? "L" : side;
  return [`HA-${m}-${oneSide}-90001`];
}
function rxExamplesForOrder(order) {
  if (!order) return ["RX-M-L-2-99123"];
  const qty = order.needs?.receiver?.qty || 0;
  if (qty === 0) return [];
  const t = (order.needs?.receiver?.type || "M").toUpperCase();
  const side = (order.needs?.receiver?.side || "L").toUpperCase();
  const len = String(order.needs?.receiver?.length || "2");

  if (qty === 2 && side === "LR") return [`RX-${t}-L-${len}-99123`, `RX-${t}-R-${len}-99124`];
  const oneSide = side === "LR" ? "L" : side;
  return [`RX-${t}-${oneSide}-${len}-99123`];
}

function validatePicked(order, pickedHAs, pickedRXs) {
  if (!order) return { ok: false, reason: "Load the Order ID first." };

  const needsHA = order.needs?.hearingAid?.qty ?? 1;
  const needsRX = order.needs?.receiver?.qty || 0;

  if (pickedHAs.length !== needsHA)
    return { ok: false, reason: `Need ${needsHA} hearing aid(s), picked ${pickedHAs.length}.` };
  if (pickedRXs.length !== needsRX)
    return { ok: false, reason: `Need ${needsRX} receiver(s), picked ${pickedRXs.length}.` };

  for (const s of pickedHAs) {
    const info = parseHA(s);
    if (!info) return { ok: false, reason: `Invalid HA format: ${s}` };
    const rule = order.needs.hearingAid;
    if (rule.model && info.model !== rule.model.toUpperCase())
      return { ok: false, reason: `HA model mismatch: need ${rule.model}, got ${info.model}` };
    if (rule.side && !sideAllowed(rule.side, info.side))
      return { ok: false, reason: `HA side mismatch: need ${rule.side}, got ${info.side}` };
  }

  if (needsRX > 0) {
    for (const s of pickedRXs) {
      const info = parseRX(s);
      if (!info) return { ok: false, reason: `Invalid RX format: ${s}` };
      const rule = order.needs.receiver;
      if (rule.type && info.type !== rule.type.toUpperCase())
        return { ok: false, reason: `RX type mismatch: need ${rule.type}, got ${info.type}` };
      if (rule.length && info.length !== String(rule.length))
        return { ok: false, reason: `RX length mismatch: need ${rule.length}, got ${info.length}` };
      if (rule.side && !sideAllowed(rule.side, info.side))
        return { ok: false, reason: `RX side mismatch: need ${rule.side}, got ${info.side}` };
    }
  }

  // If LR requires 2, must include both L and R
  if (needsHA === 2 && (order.needs.hearingAid?.side || "").toUpperCase() === "LR") {
    const sides = pickedHAs.map((x) => parseHA(x)?.side).filter(Boolean);
    if (!(sides.includes("L") && sides.includes("R"))) return { ok: false, reason: "Need L and R hearing aids." };
  }
  if (needsRX === 2 && (order.needs.receiver?.side || "").toUpperCase() === "LR") {
    const sides = pickedRXs.map((x) => parseRX(x)?.side).filter(Boolean);
    if (!(sides.includes("L") && sides.includes("R"))) return { ok: false, reason: "Need L and R receivers." };
  }

  return { ok: true, reason: "" };
}

/** sessionStorage */
function loadJSON(key) {
  try {
    return JSON.parse(sessionStorage.getItem(key) || "{}");
  } catch {
    return {};
  }
}
function saveJSON(key, v) {
  sessionStorage.setItem(key, JSON.stringify(v));
}
function resetDemoData() {
  sessionStorage.removeItem("consumed_orders_v1");
  sessionStorage.removeItem("tracker_map_v1");
}
function getAuth() {
  return sessionStorage.getItem(AUTH_KEY) === "1";
}
function setAuth(v) {
  if (v) sessionStorage.setItem(AUTH_KEY, "1");
  else sessionStorage.removeItem(AUTH_KEY);
}

const initial = {
  orderId: "",
  order: null,
  pickedHearingAids: [],
  pickedReceivers: [],
  status: "IDLE",
  error: "",
  consumedAt: "",
  trackerId: "",
  attachStatus: "",
};

function Pill({ children, tone = "neutral" }) {
  const bg = tone === "good" ? "#ECFDF5" : tone === "bad" ? "#FEF2F2" : "rgba(255,255,255,0.18)";
  const br = tone === "good" ? "#A7F3D0" : tone === "bad" ? "#FECACA" : "rgba(255,255,255,0.25)";
  const fg = tone === "good" ? THEME.good : tone === "bad" ? THEME.bad : "white";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "7px 12px",
        borderRadius: 999,
        background: bg,
        border: `1px solid ${br}`,
        color: fg,
        fontSize: 13,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function Button({ children, onClick, disabled, variant = "primary" }) {
  const primary = variant === "primary";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "11px 14px",
        borderRadius: 12,
        border: primary ? `1px solid ${THEME.brand}` : `1px solid ${THEME.border}`,
        background: disabled ? "#E5E7EB" : primary ? THEME.brand : THEME.card,
        color: disabled ? "#64748B" : primary ? "white" : THEME.text,
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [isAuthed, setIsAuthed] = useState(getAuth());
  const [pin, setPin] = useState("");
  const [pinErr, setPinErr] = useState("");
  const [s, setS] = useState(initial);

  const orderRef = useRef(null);
  const haRef = useRef(null);
  const rxRef = useRef(null);
  const trackerRef = useRef(null);

  const needsRX = s.order?.needs?.receiver?.qty || 0;

  const haExamples = useMemo(() => haExamplesForOrder(s.order), [s.order]);
  const rxExamples = useMemo(() => rxExamplesForOrder(s.order), [s.order]);

  const haExampleText = haExamples.join(", ");
  const rxExampleText = rxExamples.join(", ");

  const validation = useMemo(
    () => validatePicked(s.order, s.pickedHearingAids, s.pickedReceivers),
    [s.order, s.pickedHearingAids, s.pickedReceivers]
  );

  const readyToConsume = !!s.order && validation.ok && s.status !== "CONSUMED";

  function doLogin() {
    if (normalize(pin) === LOGIN_PIN) {
      setAuth(true);
      setIsAuthed(true);
      setPin("");
      setPinErr("");
      setTimeout(() => orderRef.current?.focus(), 0);
    } else {
      setPinErr("Wrong PIN. Use 2059.");
    }
  }

  function signOut() {
    setAuth(false);
    setIsAuthed(false);
    setPin("");
    setsetPinErr("");
    setS(initial);
  }

  function loadOrderById(orderIdRaw) {
    const orderId = normalize(orderIdRaw);
    if (!orderId) return;

    const order = SAMPLE_ORDER_RULES[orderId];
    if (!order) {
      setS((p) => ({
        ...p,
        orderId,
        order: null,
        status: "ERROR",
        error: `Order not found in demo data: ${orderId}. Try 1122, 2201, 4400, 5500.`,
      }));
      return;
    }

    const consumedMap = loadJSON("consumed_orders_v1");
    const consumed = consumedMap[orderId] || null;

    setS(() => ({
      ...initial,
      orderId,
      order,
      status: consumed ? "CONSUMED" : "IDLE",
      consumedAt: consumed?.consumedAt || "",
      pickedHearingAids: consumed?.picked?.hearingAids || [],
      pickedReceivers: consumed?.picked?.receivers || [],
      trackerId: "",
      attachStatus: "",
      error: "",
    }));

    setTimeout(() => haRef.current?.focus(), 0);
  }

  function onHAKeyDown(e) {
    if (e.key !== "Enter") return;
    const v = normalize(e.currentTarget.value).toUpperCase();
    if (!v) return;
    setS((p) => ({ ...p, pickedHearingAids: addUnique(p.pickedHearingAids, v), attachStatus: "" }));
    e.currentTarget.value = "";
    if (needsRX > 0) rxRef.current?.focus();
  }

  function onRXKeyDown(e) {
    if (e.key !== "Enter") return;
    const v = normalize(e.currentTarget.value).toUpperCase();
    if (!v) return;
    setS((p) => ({ ...p, pickedReceivers: addUnique(p.pickedReceivers, v), attachStatus: "" }));
    e.currentTarget.value = "";
  }

  function consume() {
    if (!readyToConsume) return;

    const consumedAt = new Date().toISOString();
    const payload = {
      orderId: s.order.orderId,
      consumedAt,
      picked: { hearingAids: s.pickedHearingAids, receivers: s.pickedReceivers },
      status: "CONSUMED",
    };

    const consumedMap = loadJSON("consumed_orders_v1");
    consumedMap[s.order.orderId] = payload;
    saveJSON("consumed_orders_v1", consumedMap);

    setS((p) => ({
      ...p,
      status: "CONSUMED",
      consumedAt,
      error: "",
      attachStatus: "",
      trackerId: "",
    }));

    setTimeout(() => trackerRef.current?.focus(), 0);
  }

  function unconsumeOrder() {
    if (!s.order) return;
    const orderId = s.order.orderId;

    const consumedMap = loadJSON("consumed_orders_v1");
    delete consumedMap[orderId];
    saveJSON("consumed_orders_v1", consumedMap);

    const trackerMap = loadJSON("tracker_map_v1");
    for (const [trackerId, data] of Object.entries(trackerMap)) {
      if (data?.orderId === orderId) delete trackerMap[trackerId];
    }
    saveJSON("tracker_map_v1", trackerMap);

    setS((p) => ({
      ...p,
      status: "IDLE",
      consumedAt: "",
      trackerId: "",
      attachStatus: "",
      pickedHearingAids: [],
      pickedReceivers: [],
      error: "",
    }));

    setTimeout(() => haRef.current?.focus(), 0);
  }

  function attachToTracker(trackerRaw) {
    const trackerId = normalizeTracker(trackerRaw);
    if (!trackerId) {
      setS((p) => ({ ...p, attachStatus: "Scan tracker QR first." }));
      return;
    }
    if (s.status !== "CONSUMED") {
      setS((p) => ({ ...p, attachStatus: "Consume first, then scan tracker QR." }));
      return;
    }

    const trackerMap = loadJSON("tracker_map_v1");
    trackerMap[trackerId] = {
      trackerId,
      orderId: s.order.orderId,
      consumedAt: s.consumedAt,
      picked: { hearingAids: s.pickedHearingAids, receivers: s.pickedReceivers },
      status: "READY_FOR_NEXT_STATION",
      savedAt: new Date().toISOString(),
    };
    saveJSON("tracker_map_v1", trackerMap);

    setS((p) => ({
      ...p,
      trackerId,
      attachStatus: `✅ Tracker attached (${trackerId}). Bin is ready for next station.`,
    }));
  }

  function clearPicked() {
    if (s.status === "CONSUMED") return;
    setS((p) => ({ ...p, pickedHearingAids: [], pickedReceivers: [], status: "IDLE", error: "", attachStatus: "" }));
    setTimeout(() => haRef.current?.focus(), 0);
  }

  function newOrder() {
    setS(initial);
    setTimeout(() => orderRef.current?.focus(), 0);
  }

  function onResetDemo() {
    resetDemoData();
    setS(initial);
    setTimeout(() => orderRef.current?.focus(), 0);
  }

  if (!isAuthed) {
    return (
      <div style={SHELL_STYLE}>
        <div style={{ width: "100%", maxWidth: 520, padding: 14, alignSelf: "center" }}>
          <div
            style={{
              width: "100%",
              borderRadius: 18,
              border: `1px solid ${THEME.border}`,
              background: THEME.card,
              boxShadow: "0 18px 50px rgba(15,23,42,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: 22,
                color: "white",
                textAlign: "center",
                background: `linear-gradient(135deg, ${THEME.brand}, ${THEME.brand2})`,
              }}
            >
              <div style={{ fontWeight: 900, fontSize: 24, letterSpacing: 0.2 }}>{APP_TITLE}</div>
              <div style={{ opacity: 0.92, marginTop: 6, fontSize: 14 }}>{APP_SUBTITLE}</div>
            </div>

            <div style={{ padding: 18 }}>
              <label style={{ fontWeight: 800, color: THEME.text }}>Enter PIN</label>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doLogin()}
                placeholder="2059"
                style={{
                  marginTop: 8,
                  width: "100%",
                  padding: 14,
                  fontSize: 18,
                  borderRadius: 14,
                  border: `1px solid ${THEME.border}`,
                  outline: "none",
                }}
                inputMode="numeric"
              />
              {pinErr && <div style={{ marginTop: 10, color: THEME.bad, fontWeight: 900 }}>{pinErr}</div>}

              <div style={{ marginTop: 14 }}>
                <Button onClick={doLogin}>Login</Button>
              </div>

              <div style={{ marginTop: 12, color: THEME.muted, fontSize: 12, textAlign: "center" }}>
                Demo only (front-end). Closing the tab clears demo consumed state.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const headerStatus =
    s.status === "CONSUMED" ? "CONSUMED" : s.order && validation.ok ? "READY" : s.order ? "IN PROGRESS" : "IDLE";

  return (
    <div style={SHELL_STYLE}>
      <div style={{ width: "100%", maxWidth: APP_WIDTH }}>
        {/* HEADER */}
        <div
          style={{
            background: `linear-gradient(135deg, ${THEME.brand}, ${THEME.brand2})`,
            color: "white",
            boxShadow: "0 10px 30px rgba(212,75,40,0.28)",
            borderBottomLeftRadius: 18,
            borderBottomRightRadius: 18,
          }}
        >
          <div style={{ padding: "18px 14px", position: "relative" }}>
            <div style={{ position: "absolute", right: 14, top: 14 }}>
              <button
                onClick={signOut}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.30)",
                  background: "rgba(255,255,255,0.16)",
                  color: "white",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Sign out
              </button>
            </div>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: 0.2 }}>{APP_TITLE}</div>
              <div style={{ opacity: 0.92, marginTop: 6, fontSize: 15 }}>{APP_SUBTITLE}</div>

              <div style={{ marginTop: 12, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <Pill>{USER_NAME}</Pill>
                {s.order ? (
                  <Pill>
                    Order <span style={{ fontFamily: "ui-monospace", fontWeight: 900 }}>{s.order.orderId}</span>
                  </Pill>
                ) : (
                  <Pill>No order loaded</Pill>
                )}
                <Pill>{headerStatus}</Pill>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ padding: 14 }}>
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gap: 12,
              padding: 16,
              border: `1px solid ${THEME.border}`,
              borderRadius: 18,
              background: THEME.card,
              boxShadow: "0 16px 40px rgba(15,23,42,0.06)",
            }}
          >
            {/* 1) Order ID */}
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontWeight: 900, color: THEME.text }}>
                1) Scan/Enter Order ID <span style={{ color: THEME.muted, fontWeight: 800 }}>(Enter loads)</span>
              </label>
              <input
                ref={orderRef}
                placeholder="Order ID (demo: 1122, 2201, 4400, 5500)"
                onKeyDown={(e) => e.key === "Enter" && loadOrderById(e.currentTarget.value)}
                style={{
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 12,
                  border: `1px solid ${THEME.border}`,
                  outline: "none",
                }}
              />
              {s.error && <div style={{ color: THEME.bad, fontWeight: 900 }}>{s.error}</div>}
            </div>

            {/* Requirements */}
            <div style={{ padding: 14, borderRadius: 16, background: "#F9FAFB", border: `1px solid ${THEME.border}` }}>
              <div style={{ fontWeight: 900, color: THEME.text, fontSize: 16 }}>Order Requirements</div>
              {!s.order ? (
                <div style={{ marginTop: 8, color: THEME.muted }}>Load an Order ID to see what to pick.</div>
              ) : (
                <div style={{ marginTop: 8, color: THEME.text }}>
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    <li>
                      Hearing Aids: <b>{s.order.needs.hearingAid.qty}</b> (Model <b>{s.order.needs.hearingAid.model}</b>, Side{" "}
                      <b>{s.order.needs.hearingAid.side}</b>)
                    </li>
                    <li>
                      Receivers: <b>{s.order.needs.receiver.qty}</b>{" "}
                      {s.order.needs.receiver.qty > 0 ? (
                        <>
                          (Type <b>{s.order.needs.receiver.type}</b>, Side <b>{s.order.needs.receiver.side}</b>, Length{" "}
                          <b>{s.order.needs.receiver.length}</b>)
                        </>
                      ) : (
                        <span style={{ color: THEME.muted }}>(No receiver needed)</span>
                      )}
                    </li>
                  </ul>

                  {s.status === "CONSUMED" && (
                    <div style={{ marginTop: 10, color: THEME.good, fontWeight: 900 }}>
                      ✅ Consumed at: {new Date(s.consumedAt).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2) Scan Picked */}
            <div style={{ padding: 14, borderRadius: 16, border: `1px solid ${THEME.border}`, background: THEME.card }}>
              <div style={{ fontWeight: 900, color: THEME.text, fontSize: 16 }}>2) Scan Picked Parts</div>

              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: needsRX > 0 ? "1fr 1fr" : "1fr",
                  gap: 12,
                }}
              >
                {/* HA */}
                <div style={{ padding: 12, borderRadius: 14, background: "#F9FAFB", border: `1px solid ${THEME.border}` }}>
                  <div style={{ fontWeight: 900, color: THEME.text }}>
                    Hearing Aid{" "}
                    <span style={{ color: THEME.muted, fontWeight: 800 }}>
                      (Enter adds) — Example{haExamples.length > 1 ? "s" : ""}: <code>{haExampleText}</code>
                    </span>
                  </div>
                  <input
                    ref={haRef}
                    placeholder={`Scan HA (e.g., ${haExamples[0]})`}
                    onKeyDown={onHAKeyDown}
                    style={{
                      marginTop: 10,
                      width: "100%",
                      padding: 12,
                      fontSize: 16,
                      borderRadius: 12,
                      border: `1px solid ${THEME.border}`,
                      outline: "none",
                    }}
                    disabled={!s.order || s.status === "CONSUMED"}
                  />

                  <div style={{ marginTop: 10 }}>
                    <b>Picked Hearing Aids:</b>
                    {s.pickedHearingAids.length === 0 ? (
                      <div style={{ color: THEME.muted }}>None</div>
                    ) : (
                      <ul style={{ marginTop: 8 }}>
                        {s.pickedHearingAids.map((x) => (
                          <li key={x} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            <span style={{ fontFamily: "ui-monospace" }}>{x}</span>
                            <button
                              disabled={s.status === "CONSUMED"}
                              onClick={() => setS((p) => ({ ...p, pickedHearingAids: removeItem(p.pickedHearingAids, x) }))}
                              style={{
                                padding: "6px 10px",
                                borderRadius: 10,
                                border: `1px solid ${THEME.border}`,
                                background: THEME.card,
                                cursor: "pointer",
                                fontWeight: 900,
                              }}
                            >
                              remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* RX */}
                {needsRX > 0 && (
                  <div style={{ padding: 12, borderRadius: 14, background: "#F9FAFB", border: `1px solid ${THEME.border}` }}>
                    <div style={{ fontWeight: 900, color: THEME.text }}>
                      Receiver{" "}
                      <span style={{ color: THEME.muted, fontWeight: 800 }}>
                        (Enter adds) — Example{rxExamples.length > 1 ? "s" : ""}: <code>{rxExampleText}</code>
                      </span>
                    </div>
                    <input
                      ref={rxRef}
                      placeholder={`Scan RX (e.g., ${rxExamples[0]})`}
                      onKeyDown={onRXKeyDown}
                      style={{
                        marginTop: 10,
                        width: "100%",
                        padding: 12,
                        fontSize: 16,
                        borderRadius: 12,
                        border: `1px solid ${THEME.border}`,
                        outline: "none",
                      }}
                      disabled={!s.order || s.status === "CONSUMED"}
                    />

                    <div style={{ marginTop: 10 }}>
                      <b>Picked Receivers:</b>
                      {s.pickedReceivers.length === 0 ? (
                        <div style={{ color: THEME.muted }}>None</div>
                      ) : (
                        <ul style={{ marginTop: 8 }}>
                          {s.pickedReceivers.map((x) => (
                            <li key={x} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                              <span style={{ fontFamily: "ui-monospace" }}>{x}</span>
                              <button
                                disabled={s.status === "CONSUMED"}
                                onClick={() => setS((p) => ({ ...p, pickedReceivers: removeItem(p.pickedReceivers, x) }))}
                                style={{
                                  padding: "6px 10px",
                                  borderRadius: 10,
                                  border: `1px solid ${THEME.border}`,
                                  background: THEME.card,
                                  cursor: "pointer",
                                  fontWeight: 900,
                                }}
                              >
                                remove
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Validation + buttons */}
              <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "#F3F4F6", border: `1px solid ${THEME.border}` }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <div>
                    <b>Validation:</b>{" "}
                    {s.order && validation.ok ? (
                      <span style={{ color: THEME.good, fontWeight: 900 }}>✅ Ready</span>
                    ) : (
                      <span style={{ color: THEME.muted, fontWeight: 800 }}>—</span>
                    )}
                    {s.order && !validation.ok && (s.pickedHearingAids.length > 0 || s.pickedReceivers.length > 0) && (
                      <div style={{ marginTop: 6, color: THEME.bad, fontWeight: 900 }}>{validation.reason}</div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <Button onClick={consume} disabled={!readyToConsume}>
                      Consume
                    </Button>
                    <Button onClick={unconsumeOrder} disabled={!s.order || s.status !== "CONSUMED"} variant="secondary">
                      Unconsume
                    </Button>
                    <Button onClick={clearPicked} disabled={!s.order || s.status === "CONSUMED"} variant="secondary">
                      Clear Picked
                    </Button>
                    <Button onClick={newOrder} variant="secondary">
                      New Order
                    </Button>
                    <Button onClick={onResetDemo} variant="secondary">
                      Reset Demo Data
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 3) Tracker */}
            <div style={{ padding: 14, borderRadius: 16, border: `1px solid ${THEME.border}`, background: THEME.card }}>
              <div style={{ fontWeight: 900, color: THEME.text, fontSize: 16 }}>3) Scan Order Tracker QR (Proceed next station)</div>
              <div style={{ marginTop: 8, color: THEME.muted }}>
                Disabled until you click <b>Consume</b>.
              </div>

              <input
                ref={trackerRef}
                placeholder="Scan tracker (example: OT-55555 or 55555)"
                onKeyDown={(e) => e.key === "Enter" && attachToTracker(e.currentTarget.value)}
                style={{
                  marginTop: 10,
                  width: "100%",
                  padding: 12,
                  fontSize: 16,
                  borderRadius: 12,
                  border: `1px solid ${THEME.border}`,
                  outline: "none",
                }}
                disabled={!s.order || s.status !== "CONSUMED"}
              />

              {s.attachStatus && (
                <div style={{ marginTop: 10, fontWeight: 900, color: s.attachStatus.startsWith("✅") ? THEME.good : THEME.bad }}>
                  {s.attachStatus}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
