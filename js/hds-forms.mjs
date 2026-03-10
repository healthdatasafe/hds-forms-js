import { jsxs as l, jsx as a, Fragment as fe } from "react/jsx-runtime";
import { getHDSModel as J, localizeText as Y, l as Fe } from "hds-lib";
import { useMemo as B, useRef as re, useState as O, useEffect as se, useCallback as je } from "react";
function Oe({ label: e, description: t, value: n, onChange: p, disabled: o }) {
  return /* @__PURE__ */ l("div", { className: "flex items-start gap-3", children: [
    /* @__PURE__ */ a(
      "input",
      {
        type: "checkbox",
        checked: !!n,
        onChange: (c) => p(c.target.checked),
        disabled: o,
        className: "mt-1 h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
      }
    ),
    /* @__PURE__ */ l("div", { children: [
      /* @__PURE__ */ a("label", { className: "text-sm font-medium text-gray-900 dark:text-gray-300", children: e }),
      t && /* @__PURE__ */ a("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: t })
    ] })
  ] });
}
function Le({ label: e, description: t, value: n, onChange: p, required: o, disabled: c }) {
  return /* @__PURE__ */ l("div", { children: [
    /* @__PURE__ */ l("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      o && /* @__PURE__ */ a("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ a("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ a(
      "input",
      {
        type: "date",
        value: n || "",
        onChange: (d) => p(d.target.value),
        required: o,
        disabled: c,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      }
    )
  ] });
}
function Me({ label: e, description: t, value: n, onChange: p, required: o, disabled: c }) {
  return /* @__PURE__ */ l("div", { children: [
    /* @__PURE__ */ l("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      o && /* @__PURE__ */ a("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ a("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ a(
      "input",
      {
        type: "text",
        value: n || "",
        onChange: (d) => p(d.target.value),
        required: o,
        disabled: c,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      }
    )
  ] });
}
function Ae({ label: e, description: t, value: n, onChange: p, required: o, disabled: c }) {
  return /* @__PURE__ */ l("div", { children: [
    /* @__PURE__ */ l("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      o && /* @__PURE__ */ a("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ a("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ a(
      "input",
      {
        type: "number",
        value: n ?? "",
        onChange: (d) => p(d.target.value === "" ? null : Number(d.target.value)),
        required: o,
        disabled: c,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      }
    )
  ] });
}
function Pe({ label: e, description: t, value: n, onChange: p, options: o, required: c, disabled: d }) {
  return /* @__PURE__ */ l("div", { children: [
    /* @__PURE__ */ l("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      c && /* @__PURE__ */ a("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ a("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ l(
      "select",
      {
        value: n ?? "",
        onChange: (x) => {
          const g = x.target.value, b = Number(g);
          p(g === "" ? null : isNaN(b) ? g : b);
        },
        required: c,
        disabled: d,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500",
        children: [
          /* @__PURE__ */ a("option", { value: "", children: "--" }),
          o.map((x) => /* @__PURE__ */ a("option", { value: x.value, children: x.label }, String(x.value)))
        ]
      }
    )
  ] });
}
function Ke({ label: e, description: t, value: n, onChange: p, composite: o, disabled: c }) {
  const d = n || {};
  function x(g, b) {
    p({ ...d, [g]: b });
  }
  return /* @__PURE__ */ l("fieldset", { className: "rounded-lg border border-gray-200 p-4 dark:border-gray-600", children: [
    /* @__PURE__ */ a("legend", { className: "px-2 text-sm font-medium text-gray-900 dark:text-white", children: e }),
    t && /* @__PURE__ */ a("p", { className: "mb-3 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ a("div", { className: "space-y-4", children: Object.entries(o).map(([g, b]) => /* @__PURE__ */ a(
      De,
      {
        itemData: b,
        value: d[g],
        onChange: (m) => x(g, m),
        disabled: c
      },
      g
    )) })
  ] });
}
const _e = Y;
function Be(e) {
  if (!e) return null;
  try {
    const n = J().eventTypes.getEventTypeDefinition(e);
    if (!n || n.type !== "object" || !n.properties) return null;
    const o = (n.required || [])[0];
    if (!o) return null;
    const c = [];
    for (const [d, x] of Object.entries(n.properties))
      d !== o && c.push({ key: d, schema: x });
    return c.length === 0 ? null : { datasourceProp: o, companions: c };
  } catch {
    return null;
  }
}
function ge(e, t) {
  const n = {};
  for (const { key: p, schema: o } of e.companions) {
    if (o.type !== "object" || !o.properties) continue;
    const c = {};
    for (const d of Object.keys(o.properties))
      t[d] !== void 0 && (c[d] = t[d]);
    Object.keys(c).length > 0 && (n[p] = c);
  }
  return n;
}
function ze(e) {
  try {
    const n = J().eventTypes.getEventTypeExtra(e);
    if (n != null && n.name) return _e(n.name) || n.symbol || e;
    if (n != null && n.symbol) return n.symbol;
  } catch {
  }
  return e;
}
function be(e) {
  return e.charAt(0).toUpperCase() + e.slice(1).replace(/([A-Z])/g, " $1");
}
const G = Y;
function ne(e) {
  return typeof e == "string" ? e : typeof e == "object" && e !== null && G(e) || "";
}
const he = "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400", we = "mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400";
function Ue({ schema: e, value: t, onChange: n, readonlyKeys: p }) {
  if (e.type !== "object" || !e.properties) return null;
  const o = t || {};
  function c(h, w) {
    const T = { ...o, [h]: w };
    (w === "" || w === void 0 || w === null) && delete T[h], n(Object.keys(T).length > 0 ? T : void 0);
  }
  const d = Object.entries(e.properties), x = d.filter(([, h]) => h.type === "number" || h.type === "string" && h.enum || h.type === "boolean"), g = d.filter(([, h]) => h.type === "string" && !h.enum), b = p || /* @__PURE__ */ new Set(), m = "opacity-60 cursor-not-allowed";
  return /* @__PURE__ */ l("div", { className: "space-y-2", children: [
    x.length > 0 && /* @__PURE__ */ a("div", { className: "flex items-end gap-2", children: x.map(([h, w]) => {
      const T = b.has(h);
      return /* @__PURE__ */ l("div", { className: w.type === "number" ? "w-20 shrink-0" : "min-w-0 flex-1", title: w.description || "", children: [
        /* @__PURE__ */ a("label", { className: we, children: be(h) }),
        w.type === "number" && /* @__PURE__ */ a(
          "input",
          {
            type: "number",
            value: o[h] ?? "",
            onChange: (v) => c(h, v.target.value ? parseFloat(v.target.value) : void 0),
            disabled: T,
            placeholder: "—",
            className: `${he} ${T ? m : ""}`
          }
        ),
        w.type === "string" && w.enum && /* @__PURE__ */ l(
          "select",
          {
            value: o[h] || "",
            onChange: (v) => c(h, v.target.value || void 0),
            disabled: T,
            className: `${he} ${T ? m : ""}`,
            children: [
              /* @__PURE__ */ a("option", { value: "", children: "—" }),
              w.enum.map((v) => /* @__PURE__ */ a("option", { value: v, children: ze(v) }, v))
            ]
          }
        ),
        w.type === "boolean" && /* @__PURE__ */ a("label", { className: "flex cursor-pointer items-center gap-2", children: /* @__PURE__ */ a(
          "input",
          {
            type: "checkbox",
            checked: !!o[h],
            onChange: (v) => c(h, v.target.checked || void 0),
            disabled: T,
            className: `h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-gray-500 dark:bg-gray-700 ${T ? m : ""}`
          }
        ) })
      ] }, h);
    }) }),
    g.map(([h, w]) => {
      const T = b.has(h);
      return /* @__PURE__ */ l("div", { title: w.description || "", children: [
        /* @__PURE__ */ a("label", { className: we, children: be(h) }),
        /* @__PURE__ */ a(
          "input",
          {
            type: "text",
            value: o[h] || "",
            onChange: (v) => c(h, v.target.value || void 0),
            disabled: T,
            placeholder: w.description || be(h),
            className: `${he} ${T ? m : ""}`
          }
        )
      ] }, h);
    })
  ] });
}
function Ve({ label: e, description: t, value: n, onChange: p, required: o, disabled: c, datasource: d, eventType: x }) {
  const g = J().datasources.forKey(d), b = g.minQueryLength || 3, m = B(() => Be(x), [x]), h = m && n && n[m.datasourceProp] !== void 0, w = m && n && h ? n[m.datasourceProp] : n, T = m && n ? h ? Object.fromEntries(m.companions.map((y) => [y.key, n == null ? void 0 : n[y.key]]).filter(([, y]) => y !== void 0)) : ge(m, n) : {}, v = re(w), E = v.current != null, [i, j] = O(""), [C, N] = O([]), [D, F] = O(!1), [z, _] = O(!1), [M, L] = O([]), [A, Z] = O(/* @__PURE__ */ new Set()), [X, q] = O(() => {
    if (!E || !m || !v.current) return {};
    const y = {}, k = ge(m, v.current);
    for (const [r, s] of Object.entries(k))
      s && typeof s == "object" && (y[r] = new Set(Object.keys(s)));
    return y;
  }), H = re(null), Q = re(null), U = re("");
  se(() => {
    fetch(`${g.endpoint}/sources`).then((y) => y.json()).then((y) => {
      const k = Object.keys(y.sources || {});
      L(k), Z(new Set(k));
    }).catch(() => {
    });
  }, [g.endpoint]), se(() => {
    function y(k) {
      Q.current && !Q.current.contains(k.target) && F(!1);
    }
    return document.addEventListener("mousedown", y), () => document.removeEventListener("mousedown", y);
  }, []);
  const R = je(async (y) => {
    if (y.length < b) {
      N([]), F(!1);
      return;
    }
    _(!0);
    try {
      let k = `${g.endpoint}?${g.queryParam}=${encodeURIComponent(y)}`;
      A.size > 0 && A.size < M.length && (k += `&system=${[...A].join(",")}`);
      const u = (await (await fetch(k)).json())[g.resultKey] || [];
      N(u), F(u.length > 0);
    } catch (k) {
      console.error("DatasetSearch fetch error:", k), N([]), F(!1);
    } finally {
      _(!1);
    }
  }, [g, b, A, M.length]);
  function ce(y) {
    j(y), U.current = y, H.current && clearTimeout(H.current), H.current = setTimeout(() => R(y), 300);
  }
  function ie(y) {
    Z((k) => {
      const r = new Set(k);
      return r.has(y) ? r.size > 1 && r.delete(y) : r.add(y), r;
    });
  }
  se(() => {
    U.current.length >= b && R(U.current);
  }, [A]);
  function ee(y, k) {
    if (!m || !y) {
      p(y);
      return;
    }
    const r = { [m.datasourceProp]: y };
    if (k)
      for (const [s, u] of Object.entries(k))
        u !== void 0 && (r[s] = u);
    p(r);
  }
  function de(y) {
    const k = {};
    for (const P of g.valueFields)
      y[P] !== void 0 && (k[P] = y[P]);
    const r = m ? ge(m, y) : {}, s = {};
    for (const [P, I] of Object.entries(r))
      I && typeof I == "object" && (s[P] = new Set(Object.keys(I)));
    q(s);
    const u = { ...r };
    for (const [P, I] of Object.entries(T))
      I !== void 0 && (u[P] = I);
    ee(k, u);
    const S = ne(g.displayFields.label), f = y[S];
    j(typeof f == "object" ? G(f) || "" : String(f || "")), F(!1), N([]);
  }
  function ue() {
    j(""), U.current = "", p(null), q({}), N([]), F(!1);
  }
  function pe(y, k) {
    const r = { ...T, [y]: k };
    k === void 0 && delete r[y], ee(w, r);
  }
  const me = ne(g.displayFields.label), te = ne(g.displayFields.description), ye = B(() => {
    if (!E || !w) return "";
    const y = ne(g.displayFields.label), k = w[y];
    return typeof k == "object" ? G(k) || "" : String(k || "");
  }, [E, w, g.displayFields.label]);
  return /* @__PURE__ */ l("div", { ref: Q, className: "relative", children: [
    /* @__PURE__ */ l("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      o && /* @__PURE__ */ a("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ a("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    E ? (
      /* Edit mode: show drug name as static text, no search */
      /* @__PURE__ */ a("div", { className: "block w-full rounded-lg border border-gray-300 bg-gray-100 p-2.5 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white", children: ye })
    ) : (
      /* Create mode: search input */
      /* @__PURE__ */ l(fe, { children: [
        /* @__PURE__ */ l("div", { style: { position: "relative" }, children: [
          /* @__PURE__ */ a(
            "input",
            {
              type: "text",
              value: i,
              onChange: (y) => ce(y.target.value),
              placeholder: `Type at least ${b} characters to search...`,
              disabled: c,
              className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pr-8 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
            }
          ),
          (i || n) && !c && /* @__PURE__ */ a(
            "button",
            {
              type: "button",
              onClick: ue,
              style: { position: "absolute", right: "0.5rem", top: "50%", transform: "translateY(-50%)" },
              className: "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
              children: "×"
            }
          )
        ] }),
        M.length > 1 && /* @__PURE__ */ a("div", { className: "mt-1 flex items-center gap-3", children: M.map((y) => {
          const k = A.has(y);
          return /* @__PURE__ */ l("label", { className: "flex cursor-pointer items-center gap-1 select-none", children: [
            /* @__PURE__ */ a(
              "input",
              {
                type: "checkbox",
                checked: k,
                onChange: () => ie(y),
                className: "h-3 w-3 rounded border-gray-300 text-primary-600 focus:ring-1 focus:ring-primary-500 dark:border-gray-500 dark:bg-gray-700"
              }
            ),
            /* @__PURE__ */ a("span", { className: `text-xs ${k ? "text-gray-600 dark:text-gray-400" : "text-gray-400 line-through dark:text-gray-600"}`, children: y })
          ] }, y);
        }) }),
        z && /* @__PURE__ */ a("div", { className: "mt-1 text-xs text-gray-500 dark:text-gray-400", children: "Searching..." }),
        D && C.length > 0 && /* @__PURE__ */ a("ul", { className: "mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700", children: C.map((y, k) => {
          const r = y[me], s = y[te], u = typeof r == "object" ? G(r) || r.en || "" : String(r || ""), S = typeof s == "object" ? G(s) || s.en || "" : String(s || ""), f = Array.from(new Set((y.codes || []).map((P) => String(P.system)).filter(Boolean)));
          return /* @__PURE__ */ a(
            "li",
            {
              onClick: () => de(y),
              className: "cursor-pointer border-b border-gray-100 px-3 py-2 last:border-0 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-600",
              children: /* @__PURE__ */ l("div", { className: "flex items-start justify-between gap-2", children: [
                /* @__PURE__ */ l("div", { className: "min-w-0", children: [
                  /* @__PURE__ */ a("div", { className: "text-sm font-medium text-gray-900 dark:text-white", children: u }),
                  S && /* @__PURE__ */ a("div", { className: "text-xs text-gray-500 dark:text-gray-400", children: S })
                ] }),
                f.length > 0 && /* @__PURE__ */ a("div", { className: "flex shrink-0 gap-1", children: f.map((P) => /* @__PURE__ */ a("span", { className: "rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-gray-600 dark:text-gray-300", children: P }, P)) })
              ] })
            },
            k
          );
        }) })
      ] })
    ),
    w && m && m.companions.map(({ key: y, schema: k }) => /* @__PURE__ */ a("div", { className: "mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700", children: /* @__PURE__ */ a(
      Ue,
      {
        schema: k,
        value: T[y],
        onChange: (r) => pe(y, r),
        readonlyKeys: X[y]
      }
    ) }, y))
  ] });
}
const xe = Y;
function De({ itemData: e, value: t, onChange: n, required: p, disabled: o }) {
  const c = xe(e.label) || "", d = e.description && xe(e.description) || void 0, g = { label: c, description: d, value: t, onChange: n, required: p ?? !1, disabled: o };
  switch (e.type) {
    case "checkbox":
      return /* @__PURE__ */ a(Oe, { ...g });
    case "date":
      return /* @__PURE__ */ a(Le, { ...g });
    case "text":
      return /* @__PURE__ */ a(Me, { ...g });
    case "number":
      return /* @__PURE__ */ a(Ae, { ...g });
    case "select": {
      const b = e.options.map((m) => ({
        value: m.value,
        label: xe(m.label) || ""
      }));
      return /* @__PURE__ */ a(Pe, { ...g, options: b });
    }
    case "composite": {
      const b = e.composite;
      return /* @__PURE__ */ a(Ke, { ...g, composite: b });
    }
    case "datasource-search": {
      const b = e.datasource, m = e.eventType;
      return /* @__PURE__ */ a(Ve, { ...g, datasource: b, eventType: m });
    }
    default:
      return /* @__PURE__ */ l("div", { className: "text-sm text-red-500", children: [
        "Unknown field type: ",
        e.type
      ] });
  }
}
function We(e) {
  return new Date(e * 1e3).toLocaleDateString(void 0, { year: "numeric", month: "short", day: "numeric" });
}
function Ye(e) {
  return e == null ? "—" : typeof e == "boolean" ? e ? "✓" : "✗" : typeof e == "object" ? JSON.stringify(e) : String(e);
}
function He({ entries: e, itemKeys: t, fieldLabels: n, onEdit: p, onDelete: o }) {
  return e.length === 0 ? null : /* @__PURE__ */ l("div", { className: "mt-4", children: [
    /* @__PURE__ */ a("h4", { className: "mb-2 text-sm font-medium text-gray-700 dark:text-gray-300", children: "Previous entries" }),
    /* @__PURE__ */ a("div", { className: "overflow-x-auto", children: /* @__PURE__ */ l("table", { className: "w-full text-left text-sm text-gray-700 dark:text-gray-300", children: [
      /* @__PURE__ */ a("thead", { className: "bg-gray-50 text-xs uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-400", children: /* @__PURE__ */ l("tr", { children: [
        /* @__PURE__ */ a("th", { className: "px-3 py-2", children: "Date" }),
        t.map((c) => /* @__PURE__ */ a("th", { className: "px-3 py-2", children: n[c] || c }, c)),
        /* @__PURE__ */ a("th", { className: "px-3 py-2 text-right", children: "Actions" })
      ] }) }),
      /* @__PURE__ */ a("tbody", { children: e.map((c, d) => /* @__PURE__ */ l("tr", { className: "border-b border-gray-200 dark:border-gray-600", children: [
        /* @__PURE__ */ a("td", { className: "px-3 py-2 whitespace-nowrap", children: We(c.time) }),
        t.map((x) => /* @__PURE__ */ a("td", { className: "px-3 py-2", children: Ye(c.values[x]) }, x)),
        /* @__PURE__ */ l("td", { className: "px-3 py-2 text-right whitespace-nowrap", children: [
          /* @__PURE__ */ a(
            "button",
            {
              type: "button",
              onClick: () => p(d),
              className: "mr-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300",
              title: "Edit",
              children: "✎"
            }
          ),
          /* @__PURE__ */ a(
            "button",
            {
              type: "button",
              onClick: () => o(d),
              className: "text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300",
              title: "Delete",
              children: "✕"
            }
          )
        ] })
      ] }, d)) })
    ] }) })
  ] });
}
const oe = Y;
function Qe() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function Ge({ section: e, values: t, onSubmit: n, onDateChange: p, disabled: o, submitLabel: c, entries: d, onEditEntry: x, onDeleteEntry: g }) {
  const [b, m] = O(t || {}), [h, w] = O(Qe());
  se(() => {
    m(t || {});
  }, [t]);
  const T = J(), v = e.type === "recurring";
  function E(N, D) {
    m((F) => ({ ...F, [N]: D }));
  }
  function i(N, D) {
    m((F) => ({ ...F, [`${N}__eventType`]: D }));
  }
  function j(N) {
    if (N.preventDefault(), v) {
      const D = Math.floor(new Date(h).getTime() / 1e3);
      n({ ...b, __time: D });
    } else
      n(b);
  }
  const C = {};
  for (const N of e.itemKeys) {
    const D = T.itemsDefs.forKey(N);
    D && (C[N] = oe(D.data.label) || N);
  }
  return /* @__PURE__ */ l("form", { onSubmit: j, className: "space-y-6", children: [
    e.label && /* @__PURE__ */ a("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white", children: oe(e.label) }),
    v && /* @__PURE__ */ l("div", { children: [
      /* @__PURE__ */ a("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: "Date" }),
      /* @__PURE__ */ a(
        "input",
        {
          type: "date",
          value: h,
          onChange: (N) => {
            w(N.target.value), p == null || p(N.target.value);
          },
          disabled: o,
          className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
        }
      )
    ] }),
    e.itemKeys.map((N) => {
      var z, _;
      const D = T.itemsDefs.forKey(N);
      if (!D) return null;
      const F = (_ = (z = D.data) == null ? void 0 : z.variations) == null ? void 0 : _.eventType;
      return /* @__PURE__ */ l("div", { className: "space-y-2", children: [
        /* @__PURE__ */ a(
          De,
          {
            itemData: D.data,
            value: b[N],
            onChange: (M) => E(N, M),
            disabled: o
          }
        ),
        F && /* @__PURE__ */ a(
          Pe,
          {
            label: oe(F.label) || "",
            value: b[`${N}__eventType`],
            onChange: (M) => i(N, M),
            options: F.options.map((M) => ({
              value: M.value,
              label: oe(M.label) || ""
            })),
            disabled: o
          }
        )
      ] }, N);
    }),
    /* @__PURE__ */ a(
      "button",
      {
        type: "submit",
        disabled: o,
        className: "rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:opacity-50 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800",
        children: c || (v ? "Add entry" : "Submit")
      }
    ),
    v && d && x && g && /* @__PURE__ */ a(
      He,
      {
        entries: d,
        itemKeys: e.itemKeys,
        fieldLabels: C,
        onEdit: x,
        onDelete: g
      }
    )
  ] });
}
const le = [
  { value: "", label: "—" },
  { value: "PT8H", label: "8 hours" },
  { value: "P1D", label: "1 day" },
  { value: "P2D", label: "2 days" },
  { value: "P1W", label: "1 week" },
  { value: "P2W", label: "2 weeks" },
  { value: "P21D", label: "21 days" },
  { value: "P1M", label: "1 month" },
  { value: "P35D", label: "35 days" },
  { value: "P3M", label: "3 months" },
  { value: "P6M", label: "6 months" },
  { value: "P1Y", label: "1 year" }
], Je = [
  { value: "", label: "default (may)" },
  { value: "may", label: "May (optional)" },
  { value: "should", label: "Should (recommended)" },
  { value: "must", label: "Must (required)" }
];
function Se(e) {
  return e ? e.relativeTo ? "relative" : e.expectedInterval ? "interval" : e.cooldown ? "cooldown" : "none" : "none";
}
function Ce(e) {
  var n;
  if (!e) return "none";
  const t = [];
  if (e.cooldown && t.push(`cooldown: ${e.cooldown}`), e.expectedInterval) {
    const { min: p, max: o } = e.expectedInterval;
    t.push(`interval: ${p || "?"}–${o || "?"}`);
  }
  return e.relativeTo && t.push(`relative to ${e.relativeTo} days [${(n = e.relativeDays) == null ? void 0 : n.join(", ")}]`), e.importance && t.push(e.importance), t.join(", ") || "configured (no timing)";
}
const W = "rounded border border-gray-300 bg-white px-1 py-0.5 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white", Ze = "w-20 rounded border border-gray-300 bg-white px-1 py-0.5 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white", K = "text-gray-500 dark:text-gray-400";
function Xe({ defaultReminder: e, override: t, onChange: n, availableItemKeys: p }) {
  var v, E;
  const o = t || e, [c, d] = O(
    (t == null ? void 0 : t.enabled) === !1 ? !1 : t != null || e != null
  ), [x, g] = O(() => {
    if (t) {
      const j = Se(t);
      if (j !== "none") return j;
    }
    const i = Se(e);
    return i !== "none" ? i : "cooldown";
  });
  function b(i) {
    d(i), n(i ? void 0 : e ? { enabled: !1 } : void 0);
  }
  function m(i) {
    const C = { ...t || {}, ...i };
    for (const [N, D] of Object.entries(C))
      (D === "" || D === void 0) && delete C[N];
    n(Object.keys(C).length === 0 ? void 0 : C);
  }
  function h(i) {
    g(i);
    const j = t == null ? void 0 : t.importance, C = {};
    j && (C.importance = j), i === "cooldown" ? C.cooldown = (t == null ? void 0 : t.cooldown) || (e == null ? void 0 : e.cooldown) || "P1D" : i === "interval" ? (C.expectedInterval = (t == null ? void 0 : t.expectedInterval) || (e == null ? void 0 : e.expectedInterval) || { min: "P1W", max: "P1M" }, (t != null && t.cooldown || e != null && e.cooldown) && (C.cooldown = (t == null ? void 0 : t.cooldown) || (e == null ? void 0 : e.cooldown))) : i === "relative" && (C.relativeTo = (t == null ? void 0 : t.relativeTo) || (e == null ? void 0 : e.relativeTo) || "", C.relativeDays = (t == null ? void 0 : t.relativeDays) || (e == null ? void 0 : e.relativeDays) || [1, 2, 3]), n(Object.keys(C).length === 0 ? void 0 : C);
  }
  function w(i, j) {
    const C = (t == null ? void 0 : t.expectedInterval) || (e == null ? void 0 : e.expectedInterval) || {};
    m({ expectedInterval: { ...C, [i]: j || void 0 } });
  }
  function T(i) {
    const j = i.split(",").map((C) => parseInt(C.trim())).filter((C) => !isNaN(C));
    m({ relativeDays: j.length > 0 ? j : void 0 });
  }
  return /* @__PURE__ */ l("div", { className: "mt-1 space-y-1", children: [
    /* @__PURE__ */ l("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ a("label", { className: "text-gray-600 dark:text-gray-400", children: "Reminder:" }),
      /* @__PURE__ */ a("span", { className: "text-gray-400 dark:text-gray-500", title: e ? Ce(e) : void 0, children: e ? Ce(e) : "none in data model" }),
      /* @__PURE__ */ a(
        "input",
        {
          type: "checkbox",
          checked: c,
          onChange: (i) => b(i.target.checked),
          className: "ml-auto"
        }
      )
    ] }),
    c && /* @__PURE__ */ l("div", { className: "space-y-1", children: [
      /* @__PURE__ */ l("div", { className: "flex flex-wrap items-center gap-3", children: [
        /* @__PURE__ */ l("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ a("label", { className: K, children: "Type:" }),
          /* @__PURE__ */ l("select", { value: x, onChange: (i) => h(i.target.value), className: W, children: [
            /* @__PURE__ */ a("option", { value: "cooldown", children: "Cooldown" }),
            /* @__PURE__ */ a("option", { value: "interval", children: "Expected interval" }),
            (x === "relative" || p && p.length > 0) && /* @__PURE__ */ a("option", { value: "relative", children: "Relative to item" })
          ] })
        ] }),
        /* @__PURE__ */ l("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ a("label", { className: K, children: "Importance:" }),
          /* @__PURE__ */ a(
            "select",
            {
              value: (t == null ? void 0 : t.importance) || "",
              onChange: (i) => m({ importance: i.target.value || void 0 }),
              className: W,
              children: Je.map((i) => /* @__PURE__ */ a("option", { value: i.value, children: i.value === "" && (e != null && e.importance) ? `default (${e.importance})` : i.label }, i.value))
            }
          )
        ] })
      ] }),
      x === "cooldown" && /* @__PURE__ */ l("div", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ a("label", { className: K, children: "Cooldown:" }),
        /* @__PURE__ */ a(
          "select",
          {
            value: (o == null ? void 0 : o.cooldown) || "",
            onChange: (i) => m({ cooldown: i.target.value || void 0 }),
            className: W,
            children: le.map((i) => /* @__PURE__ */ a("option", { value: i.value, children: i.label }, i.value))
          }
        )
      ] }),
      x === "interval" && /* @__PURE__ */ l("div", { className: "flex flex-wrap items-center gap-3", children: [
        /* @__PURE__ */ l("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ a("label", { className: K, children: "Min:" }),
          /* @__PURE__ */ a(
            "select",
            {
              value: ((v = o == null ? void 0 : o.expectedInterval) == null ? void 0 : v.min) || "",
              onChange: (i) => w("min", i.target.value),
              className: W,
              children: le.map((i) => /* @__PURE__ */ a("option", { value: i.value, children: i.label }, i.value))
            }
          )
        ] }),
        /* @__PURE__ */ l("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ a("label", { className: K, children: "Max:" }),
          /* @__PURE__ */ a(
            "select",
            {
              value: ((E = o == null ? void 0 : o.expectedInterval) == null ? void 0 : E.max) || "",
              onChange: (i) => w("max", i.target.value),
              className: W,
              children: le.map((i) => /* @__PURE__ */ a("option", { value: i.value, children: i.label }, i.value))
            }
          )
        ] }),
        /* @__PURE__ */ l("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ a("label", { className: K, children: "Cooldown:" }),
          /* @__PURE__ */ a(
            "select",
            {
              value: (o == null ? void 0 : o.cooldown) || "",
              onChange: (i) => m({ cooldown: i.target.value || void 0 }),
              className: W,
              children: le.map((i) => /* @__PURE__ */ a("option", { value: i.value, children: i.label }, i.value))
            }
          )
        ] })
      ] }),
      x === "relative" && /* @__PURE__ */ l("div", { className: "flex flex-wrap items-center gap-3", children: [
        /* @__PURE__ */ l("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ a("label", { className: K, children: "Relative to:" }),
          /* @__PURE__ */ a("span", { className: "text-xs text-gray-700 dark:text-gray-300", children: (o == null ? void 0 : o.relativeTo) || "—" })
        ] }),
        /* @__PURE__ */ l("div", { className: "flex items-center gap-1", children: [
          /* @__PURE__ */ a("label", { className: K, children: "Days:" }),
          /* @__PURE__ */ a(
            "input",
            {
              type: "text",
              value: ((o == null ? void 0 : o.relativeDays) || []).join(", "),
              onChange: (i) => T(i.target.value),
              placeholder: "2, 3, 4",
              className: Ze,
              title: "Comma-separated cycle days (e.g. 2, 3, 4)"
            }
          )
        ] })
      ] })
    ] })
  ] });
}
const qe = {
  once: "Once",
  any: "Any time",
  P1D: "Daily",
  P1W: "Weekly",
  P1M: "Monthly",
  unlimited: "Unlimited"
};
function Ie(e) {
  return qe[e] || e;
}
const Re = [
  { value: "once", label: "Once" },
  { value: "any", label: "Any time" },
  { value: "P1D", label: "Daily" },
  { value: "P1W", label: "Weekly" },
  { value: "P1M", label: "Monthly" },
  { value: "unlimited", label: "Unlimited" }
];
function et(e) {
  return e ? e.split("-")[0] : "other";
}
const tt = {
  searchItems: "Search items...",
  selectSectionToAdd: "Select a section to add items",
  addPermanentSection: "Permanent section",
  addRecurringSection: "Recurring section",
  sectionName: "Section name",
  clickToAdd: "Click items in the browser to add them",
  noItems: "No items — click to select this section",
  customize: "Customize",
  repeatable: "Repeatable",
  preview: "Preview",
  addSectionsToPreview: "Add sections to preview the form",
  published: "Published"
};
function bt({
  request: e,
  readOnly: t = !1,
  onDirty: n,
  showReminders: p = !1,
  labels: o,
  defaultPreviewMode: c = null,
  headerSlot: d,
  metadataSlot: x,
  actionSlot: g
}) {
  const b = { ...tt, ...o }, m = J(), h = B(() => m.itemsDefs.getAll(), [m]), [w, T] = O(0), v = je(() => {
    T((r) => r + 1), n == null || n();
  }, [n]), [E, i] = O(null), [j, C] = O(""), [N, D] = O(c), [F, z] = O(/* @__PURE__ */ new Set()), [_, M] = O(null), L = e.sections, A = B(() => {
    const r = {};
    for (const s of h) {
      const u = s.label;
      if (j && !u.toLowerCase().includes(j.toLowerCase()) && !s.key.toLowerCase().includes(j.toLowerCase()))
        continue;
      const S = et(s.key);
      r[S] || (r[S] = []), r[S].push({ key: s.key, label: u, description: s.description, streamId: s.data.streamId });
    }
    return r;
  }, [h, j]), Z = B(() => {
    const r = /* @__PURE__ */ new Set();
    for (const s of L)
      for (const u of s.itemKeys) r.add(u);
    return r;
  }, [L, w]);
  function X(r = "permanent") {
    const s = `section-${Date.now()}`;
    e.createSection(s, r).setName({ en: "New section" }), i(s), v();
  }
  function q(r) {
    e.removeSection(r), E === r && i(null), v();
  }
  function H(r) {
    const s = L.findIndex((u) => u.key === r);
    s > 0 && (e.moveSection(r, s - 1), v());
  }
  function Q(r) {
    const s = L.findIndex((u) => u.key === r);
    s < L.length - 1 && (e.moveSection(r, s + 1), v());
  }
  function U(r, s) {
    const u = e.getSectionByKey(r);
    u && (u.setName({ en: s }), v());
  }
  function R(r) {
    const s = e.getSectionByKey(r);
    if (!s) return;
    const u = L.findIndex((I) => I.key === r), S = s.getData(), f = S.type === "permanent" ? "recurring" : "permanent";
    e.removeSection(r);
    const P = e.createSection(r, f);
    if (P.setName(S.name), P.addItemKeys(S.itemKeys), S.itemCustomizations)
      for (const [I, ae] of Object.entries(S.itemCustomizations))
        P.setItemCustomization(I, ae);
    u < L.length - 1 && e.moveSection(r, u), v();
  }
  function ce(r) {
    if (!E) return;
    const s = e.getSectionByKey(E);
    if (s)
      try {
        s.addItemKey(r), v();
      } catch (u) {
        console.warn("Cannot add item:", u);
      }
  }
  function ie(r, s) {
    const u = e.getSectionByKey(r);
    u && (u.removeItemKey(s), v());
  }
  function ee(r, s) {
    const u = e.getSectionByKey(r);
    if (!u) return;
    const S = u.itemKeys.indexOf(s);
    S > 0 && (u.moveItemKey(s, S - 1), v());
  }
  function de(r, s) {
    const u = e.getSectionByKey(r);
    if (!u) return;
    const S = u.itemKeys.indexOf(s);
    S < u.itemKeys.length - 1 && (u.moveItemKey(s, S + 1), v());
  }
  function ue(r, s, u) {
    const S = e.getSectionByKey(r);
    if (!S) return;
    const f = S.getItemCustomization(s) || {};
    if (u === "") {
      const { repeatable: P, ...I } = f;
      S.setItemCustomization(s, I);
    } else
      S.setItemCustomization(s, { ...f, repeatable: u });
    v();
  }
  function pe(r, s, u) {
    const S = e.getSectionByKey(r);
    if (!S) return;
    const f = S.getItemCustomization(s) || {};
    if (u === void 0) {
      const { reminder: P, ...I } = f;
      S.setItemCustomization(s, I);
    } else
      S.setItemCustomization(s, { ...f, reminder: u });
    v();
  }
  function me(r) {
    z((s) => {
      const u = new Set(s);
      return u.has(r) ? u.delete(r) : u.add(r), u;
    });
  }
  function te(r) {
    var s;
    try {
      return ((s = m.itemsDefs.forKey(r)) == null ? void 0 : s.label) ?? r;
    } catch {
      return r;
    }
  }
  function ye(r) {
    var s;
    try {
      return ((s = m.itemsDefs.forKey(r)) == null ? void 0 : s.description) || r;
    } catch {
      return r;
    }
  }
  const y = B(() => JSON.stringify(e.content, null, 2), [w]), k = B(() => Object.keys(A).sort(), [A]);
  return /* @__PURE__ */ l("div", { className: "flex gap-4", style: { minHeight: "600px" }, children: [
    !t && /* @__PURE__ */ l("div", { className: "w-64 shrink-0 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700", children: [
      /* @__PURE__ */ l("div", { className: "sticky top-0 border-b border-gray-200 bg-gray-50 p-2 dark:border-gray-600 dark:bg-gray-700", children: [
        /* @__PURE__ */ a(
          "input",
          {
            type: "text",
            placeholder: b.searchItems,
            value: j,
            onChange: (r) => C(r.target.value),
            className: "w-full rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          }
        ),
        !E && L.length > 0 && /* @__PURE__ */ a("p", { className: "mt-1 text-xs text-amber-600 dark:text-amber-400", children: b.selectSectionToAdd })
      ] }),
      /* @__PURE__ */ a("div", { className: "p-1", children: k.map((r) => /* @__PURE__ */ l("div", { className: "mb-1", children: [
        /* @__PURE__ */ l(
          "button",
          {
            onClick: () => me(r),
            className: "flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm font-semibold text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-600",
            children: [
              /* @__PURE__ */ l("span", { children: [
                F.has(r) ? "▾" : "▸",
                " ",
                r
              ] }),
              /* @__PURE__ */ a("span", { className: "rounded-full bg-gray-200 px-1.5 text-xs text-gray-500 dark:bg-gray-600 dark:text-gray-400", children: A[r].length })
            ]
          }
        ),
        F.has(r) && /* @__PURE__ */ a("div", { className: "ml-2", children: A[r].map((s) => {
          const u = Z.has(s.key);
          return /* @__PURE__ */ l(
            "button",
            {
              onClick: () => !u && ce(s.key),
              disabled: !E || u,
              className: `block w-full rounded px-2 py-1 text-left text-sm ${u ? "text-gray-400 dark:text-gray-500" : E ? "text-gray-700 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-blue-900 dark:hover:text-blue-300" : "text-gray-500 dark:text-gray-400"}`,
              title: s.description || s.key,
              children: [
                u && /* @__PURE__ */ a("span", { className: "mr-1", children: "✓" }),
                s.label
              ]
            },
            s.key
          );
        }) })
      ] }, r)) })
    ] }),
    /* @__PURE__ */ l("div", { className: "flex min-w-0 flex-1 flex-col gap-4", children: [
      d,
      x,
      /* @__PURE__ */ l("div", { className: "space-y-3", children: [
        L.map((r, s) => {
          var S;
          const u = E === r.key;
          return /* @__PURE__ */ l(
            "div",
            {
              className: `rounded-lg border p-3 ${u ? "border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20" : "border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-800"}`,
              onClick: () => !t && i(r.key),
              children: [
                /* @__PURE__ */ l("div", { className: "mb-2 flex items-center gap-2", children: [
                  /* @__PURE__ */ a(
                    "input",
                    {
                      type: "text",
                      value: ((S = r.name) == null ? void 0 : S.en) || "",
                      onChange: (f) => U(r.key, f.target.value),
                      className: "flex-1 rounded border border-gray-300 bg-white px-2 py-0.5 text-sm font-medium text-gray-900 focus:border-blue-500 focus:outline-none disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-white",
                      placeholder: b.sectionName,
                      disabled: t,
                      onClick: (f) => f.stopPropagation()
                    }
                  ),
                  /* @__PURE__ */ a(
                    "button",
                    {
                      onClick: (f) => {
                        f.stopPropagation(), R(r.key);
                      },
                      className: "rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-200 disabled:opacity-60 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600",
                      title: "Click to toggle type",
                      disabled: t,
                      children: r.type
                    }
                  ),
                  !t && /* @__PURE__ */ l(fe, { children: [
                    /* @__PURE__ */ a(
                      "button",
                      {
                        onClick: (f) => {
                          f.stopPropagation(), H(r.key);
                        },
                        disabled: s === 0,
                        className: "text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30 dark:hover:text-gray-300",
                        title: "Move section up",
                        children: "↑"
                      }
                    ),
                    /* @__PURE__ */ a(
                      "button",
                      {
                        onClick: (f) => {
                          f.stopPropagation(), Q(r.key);
                        },
                        disabled: s === L.length - 1,
                        className: "text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30 dark:hover:text-gray-300",
                        title: "Move section down",
                        children: "↓"
                      }
                    ),
                    /* @__PURE__ */ a(
                      "button",
                      {
                        onClick: (f) => {
                          f.stopPropagation(), q(r.key);
                        },
                        className: "text-xs text-red-400 hover:text-red-600 dark:hover:text-red-300",
                        title: "Remove section",
                        children: "×"
                      }
                    )
                  ] })
                ] }),
                r.itemKeys.length === 0 ? /* @__PURE__ */ a("p", { className: "py-2 text-center text-xs text-gray-400 dark:text-gray-500", children: t ? "" : u ? b.clickToAdd : b.noItems }) : /* @__PURE__ */ a("div", { className: "space-y-1", children: r.itemKeys.map((f, P) => {
                  const I = r.getItemCustomization(f), ae = _ === `${r.key}:${f}`, V = m.itemsDefs.forKey(f), ke = (V == null ? void 0 : V.repeatable) || "unlimited", Ee = I != null && I.repeatable ? String(I.repeatable) : ke, Ne = (I == null ? void 0 : I.repeatable) != null;
                  return /* @__PURE__ */ l("div", { children: [
                    /* @__PURE__ */ l("div", { className: "flex items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-700", children: [
                      /* @__PURE__ */ l("span", { className: "flex-1 text-gray-700 dark:text-gray-300", title: ye(f), children: [
                        te(f),
                        /* @__PURE__ */ l("span", { className: "ml-1 text-xs text-gray-400", children: [
                          "(",
                          f,
                          ")"
                        ] }),
                        /* @__PURE__ */ a(
                          "span",
                          {
                            className: `ml-1 rounded px-1 ${Ne ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "bg-gray-100 text-gray-500 dark:bg-gray-600 dark:text-gray-400"}`,
                            children: Ie(Ee)
                          }
                        )
                      ] }),
                      !t && /* @__PURE__ */ l(fe, { children: [
                        /* @__PURE__ */ a(
                          "button",
                          {
                            onClick: ($) => {
                              $.stopPropagation(), M(ae ? null : `${r.key}:${f}`);
                            },
                            className: "px-0.5 text-base text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400",
                            title: b.customize,
                            children: "⚙"
                          }
                        ),
                        /* @__PURE__ */ a(
                          "button",
                          {
                            onClick: ($) => {
                              $.stopPropagation(), ee(r.key, f);
                            },
                            disabled: P === 0,
                            className: "px-0.5 text-base text-gray-500 hover:text-gray-800 disabled:opacity-30 dark:text-gray-400 dark:hover:text-gray-200",
                            children: "↑"
                          }
                        ),
                        /* @__PURE__ */ a(
                          "button",
                          {
                            onClick: ($) => {
                              $.stopPropagation(), de(r.key, f);
                            },
                            disabled: P === r.itemKeys.length - 1,
                            className: "px-0.5 text-base text-gray-500 hover:text-gray-800 disabled:opacity-30 dark:text-gray-400 dark:hover:text-gray-200",
                            children: "↓"
                          }
                        ),
                        /* @__PURE__ */ a(
                          "button",
                          {
                            onClick: ($) => {
                              $.stopPropagation(), ie(r.key, f);
                            },
                            className: "px-0.5 text-base text-red-400 hover:text-red-600 dark:hover:text-red-300",
                            children: "×"
                          }
                        )
                      ] })
                    ] }),
                    ae && !t && /* @__PURE__ */ l("div", { className: "ml-4 mt-1 space-y-1 rounded bg-gray-100 p-2 text-xs dark:bg-gray-700", children: [
                      /* @__PURE__ */ l("div", { className: "flex items-center gap-2", children: [
                        /* @__PURE__ */ l("label", { className: "text-gray-600 dark:text-gray-400", children: [
                          b.repeatable,
                          ":"
                        ] }),
                        /* @__PURE__ */ l(
                          "select",
                          {
                            value: Ne ? String(I.repeatable) : "",
                            onChange: ($) => ue(r.key, f, $.target.value),
                            className: "rounded border border-gray-300 bg-white px-1 py-0.5 text-xs text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-white",
                            children: [
                              /* @__PURE__ */ l("option", { value: "", children: [
                                "default (",
                                Ie(ke),
                                ")"
                              ] }),
                              Re.map(($) => /* @__PURE__ */ a("option", { value: $.value, children: $.label }, $.value))
                            ]
                          }
                        )
                      ] }),
                      p && /* @__PURE__ */ a(
                        Xe,
                        {
                          defaultReminder: (V == null ? void 0 : V.reminder) || null,
                          override: I == null ? void 0 : I.reminder,
                          onChange: ($) => pe(r.key, f, $),
                          availableItemKeys: r.itemKeys.filter(($) => $ !== f).map(($) => ({ key: $, label: te($) }))
                        }
                      )
                    ] })
                  ] }, f);
                }) })
              ]
            },
            r.key
          );
        }),
        !t && /* @__PURE__ */ l("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ l(
            "button",
            {
              onClick: () => X("permanent"),
              className: "flex-1 rounded-lg border-2 border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400",
              children: [
                "+ ",
                b.addPermanentSection
              ]
            }
          ),
          /* @__PURE__ */ l(
            "button",
            {
              onClick: () => X("recurring"),
              className: "flex-1 rounded-lg border-2 border-dashed border-gray-300 py-2 text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 dark:border-gray-600 dark:text-gray-400 dark:hover:border-blue-500 dark:hover:text-blue-400",
              children: [
                "+ ",
                b.addRecurringSection
              ]
            }
          )
        ] })
      ] }),
      g,
      /* @__PURE__ */ l("div", { className: "rounded-lg border border-gray-200 dark:border-gray-600", children: [
        /* @__PURE__ */ l("div", { className: "flex items-center gap-1 bg-gray-50 px-3 py-1.5 dark:bg-gray-700", children: [
          /* @__PURE__ */ a(
            "button",
            {
              onClick: () => D(N === "json" ? null : "json"),
              className: `rounded px-2 py-0.5 text-xs font-medium ${N === "json" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"}`,
              children: "JSON"
            }
          ),
          /* @__PURE__ */ a(
            "button",
            {
              onClick: () => D(N === "preview" ? null : "preview"),
              className: `rounded px-2 py-0.5 text-xs font-medium ${N === "preview" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"}`,
              children: b.preview
            }
          )
        ] }),
        N != null && /* @__PURE__ */ a("div", { className: "max-h-96 overflow-auto border-t border-gray-200 p-3 dark:border-gray-600", children: N === "json" ? /* @__PURE__ */ a("pre", { className: "text-xs text-gray-700 dark:text-gray-300", children: y }) : L.length === 0 ? /* @__PURE__ */ a("p", { className: "py-4 text-center text-sm text-gray-400", children: b.addSectionsToPreview }) : /* @__PURE__ */ a("div", { className: "space-y-6", children: L.map((r) => /* @__PURE__ */ l("div", { className: "rounded border border-gray-200 p-3 dark:border-gray-600", children: [
          /* @__PURE__ */ l("h4", { className: "mb-2 text-sm font-medium text-gray-700 dark:text-gray-300", children: [
            Fe(r.name),
            " (",
            r.type,
            ")"
          ] }),
          /* @__PURE__ */ a(
            Ge,
            {
              section: {
                type: r.type,
                label: r.name,
                itemKeys: [...r.itemKeys]
              },
              onSubmit: () => {
              },
              disabled: !0
            }
          )
        ] }, r.key)) }) })
      ] })
    ] })
  ] });
}
const ve = Y, at = { checkbox: rt, date: nt, text: ot, number: lt, select: st, composite: it, "datasource-search": ct };
function $e(e) {
  const t = {
    title: ve(e.label) || ""
  };
  e.description != null && (t.description = ve(e.description) || void 0);
  const n = at[e.type];
  if (n == null)
    throw new Error(`Cannot find schema for type: "${e.type}"`);
  return n(t, e), t;
}
function rt(e, t) {
  e.type = "boolean";
}
function nt(e, t) {
  e.type = "string", e.format = "date", e.dateSaveFormat = "YYYY-MM-DD";
}
function ot(e, t) {
  e.type = "string", t.canBeNull !== !0 && (e.minLength = 1);
}
function lt(e, t) {
  e.type = "number";
}
function st(e, t) {
  const n = t, p = n.options.find((c) => isNaN(c.value)), o = n.options.map((c) => ({ const: c.value, title: ve(c.label) || "" }));
  e.type = p ? "string" : "number", e.oneOf = o;
}
function ct(e, t) {
  e.type = "object";
}
function it(e, t) {
  const n = t;
  e.type = "object", e.properties = {}, e.required = [];
  for (const [p, o] of Object.entries(n.composite))
    e.properties[p] = $e(o), o.canBeNull !== !0 && e.required.push(p);
}
const Te = Y;
function ht(e) {
  const t = dt(e);
  function n(p) {
    const o = structuredClone(p);
    if (t.processData && t.processData(o).createEvent === !1)
      return null;
    const c = e.eventTemplate();
    return Object.assign(c, o), c;
  }
  return { schema: t.schema, eventDataForFormData: n };
}
function dt(e) {
  var o, c;
  const t = e.data.type, n = $e(e.data);
  if (t === "checkbox" && e.data.eventType === "activity/plain")
    return {
      schema: n,
      processData: (d) => d === !0 ? {} : { createEvent: !1 }
    };
  if (t === "select" && e.data.eventType === "ratio/generic") {
    const d = Math.max(...(e.data.options || []).map((x) => Number(x.value)));
    return {
      schema: {
        title: "",
        type: "object",
        properties: {
          content: {
            title: "",
            type: "object",
            properties: {
              value: n
            },
            required: ["value"]
          }
        }
      },
      processData: (x) => {
        const g = x;
        return g.content == null ? { createEvent: !1 } : (g.content.relativeTo = d, {});
      }
    };
  }
  const p = {
    schema: {
      title: "",
      type: "object",
      properties: {
        content: n
      },
      required: ["content"]
    }
  };
  if ((c = (o = e.data) == null ? void 0 : o.variations) != null && c.eventType) {
    const d = e.data.variations.eventType;
    p.schema.properties = {
      ...p.schema.properties,
      type: {
        title: Te(d.label) || "",
        type: "string",
        oneOf: d.options.map((x) => ({ const: x.value, title: Te(x.label) || "" }))
      }
    };
  }
  return p;
}
function ut(e) {
  var p;
  if (e.data.eventType) return [e.data.eventType];
  const t = (p = e.data.variations) == null ? void 0 : p.eventType;
  if (t != null && t.options)
    return t.options.map((o) => o.value).filter(Boolean);
  const n = e.eventTemplate();
  return n.type ? [n.type] : [];
}
function xt(e, t) {
  return pt(e, t).values;
}
function pt(e, t) {
  const n = {}, p = {}, o = {};
  for (const { key: c, itemDef: d } of e) {
    const x = ut(d), g = d.data.streamId;
    if (x.length === 0 || !g) continue;
    const b = t.filter((m) => {
      var h;
      return x.includes(m.type) && ((h = m.streamIds) == null ? void 0 : h.includes(g));
    }).sort((m, h) => (h.time || 0) - (m.time || 0));
    if (b.length > 0) {
      const m = b[0];
      m.type === "activity/plain" ? n[c] = !0 : n[c] = m.content, m.id && (p[c] = m.id), o[c] = m.type;
    }
  }
  return { values: n, eventIds: p, eventTypes: o };
}
function ft(e, t, n, p) {
  const o = [], c = p || Math.floor(Date.now() / 1e3);
  for (const { key: d, itemDef: x } of e) {
    const g = t[d], b = n[d], m = x.eventTemplate(), h = t[`${d}__eventType`] || m.type;
    if (h === "activity/plain") {
      if (g === !0) {
        if (b)
          continue;
        o.push({
          action: "create",
          key: d,
          params: {
            streamIds: m.streamIds,
            type: h,
            content: null,
            time: c
          }
        });
      } else
        b && o.push({ action: "delete", key: d, params: { id: b } });
      continue;
    }
    if (g == null || g === "") {
      b && o.push({ action: "delete", key: d, params: { id: b } });
      continue;
    }
    if (b) {
      const w = { content: g };
      t[`${d}__eventType`] && (w.type = h), o.push({
        action: "update",
        key: d,
        params: { id: b, update: w }
      });
    } else
      o.push({
        action: "create",
        key: d,
        params: {
          streamIds: m.streamIds,
          type: h,
          content: g,
          time: c
        }
      });
  }
  return o;
}
function vt(e, t, n) {
  const p = [], o = n || Math.floor(Date.now() / 1e3);
  for (const { key: c, itemDef: d } of e) {
    const x = t[c];
    if (x == null) continue;
    const g = d.eventTemplate(), b = g.type;
    if (b === "activity/plain") {
      if (x === !1) continue;
      p.push({
        streamIds: g.streamIds,
        type: b,
        content: null,
        time: o
      });
      continue;
    }
    p.push({
      streamIds: g.streamIds,
      type: b,
      content: x,
      time: o
    });
  }
  return p;
}
export {
  Ve as DatasetSearch,
  He as EntryList,
  bt as FormBuilder,
  De as HDSFormField,
  Ge as HDSFormSection,
  qe as REPEATABLE_LABELS,
  Re as REPEATABLE_OPTIONS,
  Xe as ReminderEditor,
  ge as extractCompanionDefaults,
  ft as formDataToActions,
  vt as formDataToEventBatch,
  Be as getCompanionSchema,
  ze as getEnumLabel,
  et as getItemGroup,
  ht as jsonFormForItemDef,
  be as keyToLabel,
  pt as matchEventsToItemDefs,
  xt as prefillFromEvents,
  Ie as repeatableLabel,
  $e as schemaFor
};
