import { jsxs as m, jsx as r } from "react/jsx-runtime";
import { getHDSModel as q, localizeText as I } from "hds-lib";
import { useState as S, useRef as K, useEffect as P, useCallback as B } from "react";
function H({ label: e, description: t, value: o, onChange: s, disabled: a }) {
  return /* @__PURE__ */ m("div", { className: "flex items-start gap-3", children: [
    /* @__PURE__ */ r(
      "input",
      {
        type: "checkbox",
        checked: !!o,
        onChange: (n) => s(n.target.checked),
        disabled: a,
        className: "mt-1 h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
      }
    ),
    /* @__PURE__ */ m("div", { children: [
      /* @__PURE__ */ r("label", { className: "text-sm font-medium text-gray-900 dark:text-gray-300", children: e }),
      t && /* @__PURE__ */ r("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: t })
    ] })
  ] });
}
function Q({ label: e, description: t, value: o, onChange: s, required: a, disabled: n }) {
  return /* @__PURE__ */ m("div", { children: [
    /* @__PURE__ */ m("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      a && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ r(
      "input",
      {
        type: "date",
        value: o || "",
        onChange: (c) => s(c.target.value),
        required: a,
        disabled: n,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      }
    )
  ] });
}
function z({ label: e, description: t, value: o, onChange: s, required: a, disabled: n }) {
  return /* @__PURE__ */ m("div", { children: [
    /* @__PURE__ */ m("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      a && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ r(
      "input",
      {
        type: "text",
        value: o || "",
        onChange: (c) => s(c.target.value),
        required: a,
        disabled: n,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      }
    )
  ] });
}
function U({ label: e, description: t, value: o, onChange: s, required: a, disabled: n }) {
  return /* @__PURE__ */ m("div", { children: [
    /* @__PURE__ */ m("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      a && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ r(
      "input",
      {
        type: "number",
        value: o ?? "",
        onChange: (c) => s(c.target.value === "" ? null : Number(c.target.value)),
        required: a,
        disabled: n,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      }
    )
  ] });
}
function V({ label: e, description: t, value: o, onChange: s, options: a, required: n, disabled: c }) {
  return /* @__PURE__ */ m("div", { children: [
    /* @__PURE__ */ m("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      n && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ m(
      "select",
      {
        value: o ?? "",
        onChange: (l) => {
          const i = l.target.value, d = Number(i);
          s(i === "" ? null : isNaN(d) ? i : d);
        },
        required: n,
        disabled: c,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500",
        children: [
          /* @__PURE__ */ r("option", { value: "", children: "--" }),
          a.map((l) => /* @__PURE__ */ r("option", { value: l.value, children: l.label }, String(l.value)))
        ]
      }
    )
  ] });
}
function J({ label: e, description: t, value: o, onChange: s, composite: a, disabled: n }) {
  const c = o || {};
  function l(i, d) {
    s({ ...c, [i]: d });
  }
  return /* @__PURE__ */ m("fieldset", { className: "rounded-lg border border-gray-200 p-4 dark:border-gray-600", children: [
    /* @__PURE__ */ r("legend", { className: "px-2 text-sm font-medium text-gray-900 dark:text-white", children: e }),
    t && /* @__PURE__ */ r("p", { className: "mb-3 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ r("div", { className: "space-y-4", children: Object.entries(a).map(([i, d]) => /* @__PURE__ */ r(
      Y,
      {
        itemData: d,
        value: c[i],
        onChange: (u) => l(i, u),
        disabled: n
      },
      i
    )) })
  ] });
}
const L = I;
function G({ label: e, description: t, value: o, onChange: s, required: a, disabled: n, datasource: c }) {
  const l = q().datasources.forKey(c), i = l.minQueryLength || 3, [d, u] = S(""), [f, x] = S([]), [C, b] = S(!1), [E, F] = S(!1), D = K(null), T = K(null);
  P(() => {
    function y(g) {
      T.current && !T.current.contains(g.target) && b(!1);
    }
    return document.addEventListener("mousedown", y), () => document.removeEventListener("mousedown", y);
  }, []);
  const p = B(async (y) => {
    if (y.length < i) {
      x([]), b(!1);
      return;
    }
    F(!0);
    try {
      const g = `${l.endpoint}?${l.queryParam}=${encodeURIComponent(y)}`, N = (await (await fetch(g)).json())[l.resultKey] || [];
      x(N), b(N.length > 0);
    } catch (g) {
      console.error("DatasetSearch fetch error:", g), x([]), b(!1);
    } finally {
      F(!1);
    }
  }, [l, i]);
  function h(y) {
    u(y), D.current && clearTimeout(D.current), D.current = setTimeout(() => p(y), 300);
  }
  function v(y) {
    const g = {};
    for (const N of l.valueFields)
      y[N] !== void 0 && (g[N] = y[N]);
    s(g);
    const w = l.displayFields.label, k = y[w];
    u(typeof k == "object" ? L(k) || "" : String(k || "")), b(!1), x([]);
  }
  function j() {
    u(""), s(null), x([]), b(!1);
  }
  return /* @__PURE__ */ m("div", { ref: T, className: "relative", children: [
    /* @__PURE__ */ m("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      a && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ m("div", { className: "relative", children: [
      /* @__PURE__ */ r(
        "input",
        {
          type: "text",
          value: d,
          onChange: (y) => h(y.target.value),
          placeholder: `Type at least ${i} characters to search...`,
          disabled: n,
          className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pr-8 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
        }
      ),
      (d || o) && !n && /* @__PURE__ */ r(
        "button",
        {
          type: "button",
          onClick: j,
          className: "absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
          children: "×"
        }
      )
    ] }),
    E && /* @__PURE__ */ r("div", { className: "mt-1 text-xs text-gray-500 dark:text-gray-400", children: "Searching..." }),
    C && f.length > 0 && /* @__PURE__ */ r("ul", { className: "absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700", children: f.map((y, g) => {
      const w = y[l.displayFields.label], k = y[l.displayFields.description], N = typeof w == "object" ? L(w) || w.en || "" : String(w || ""), R = typeof k == "object" ? L(k) || k.en || "" : String(k || "");
      return /* @__PURE__ */ m(
        "li",
        {
          onClick: () => v(y),
          className: "cursor-pointer border-b border-gray-100 px-3 py-2 last:border-0 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-600",
          children: [
            /* @__PURE__ */ r("div", { className: "text-sm font-medium text-gray-900 dark:text-white", children: N }),
            R && /* @__PURE__ */ r("div", { className: "text-xs text-gray-500 dark:text-gray-400", children: R })
          ]
        },
        g
      );
    }) })
  ] });
}
const $ = I;
function Y({ itemData: e, value: t, onChange: o, required: s, disabled: a }) {
  const n = $(e.label) || "", c = e.description && $(e.description) || void 0, i = { label: n, description: c, value: t, onChange: o, required: s ?? !1, disabled: a };
  switch (e.type) {
    case "checkbox":
      return /* @__PURE__ */ r(H, { ...i });
    case "date":
      return /* @__PURE__ */ r(Q, { ...i });
    case "text":
      return /* @__PURE__ */ r(z, { ...i });
    case "number":
      return /* @__PURE__ */ r(U, { ...i });
    case "select": {
      const d = e.options.map((u) => ({
        value: u.value,
        label: $(u.label) || ""
      }));
      return /* @__PURE__ */ r(V, { ...i, options: d });
    }
    case "composite": {
      const d = e.composite;
      return /* @__PURE__ */ r(J, { ...i, composite: d });
    }
    case "datasource-search": {
      const d = e.datasource;
      return /* @__PURE__ */ r(G, { ...i, datasource: d });
    }
    default:
      return /* @__PURE__ */ m("div", { className: "text-sm text-red-500", children: [
        "Unknown field type: ",
        e.type
      ] });
  }
}
function W(e) {
  return new Date(e * 1e3).toLocaleDateString(void 0, { year: "numeric", month: "short", day: "numeric" });
}
function X(e) {
  return e == null ? "—" : typeof e == "boolean" ? e ? "✓" : "✗" : typeof e == "object" ? JSON.stringify(e) : String(e);
}
function Z({ entries: e, itemKeys: t, fieldLabels: o, onEdit: s, onDelete: a }) {
  return e.length === 0 ? null : /* @__PURE__ */ m("div", { className: "mt-4", children: [
    /* @__PURE__ */ r("h4", { className: "mb-2 text-sm font-medium text-gray-700 dark:text-gray-300", children: "Previous entries" }),
    /* @__PURE__ */ r("div", { className: "overflow-x-auto", children: /* @__PURE__ */ m("table", { className: "w-full text-left text-sm text-gray-700 dark:text-gray-300", children: [
      /* @__PURE__ */ r("thead", { className: "bg-gray-50 text-xs uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-400", children: /* @__PURE__ */ m("tr", { children: [
        /* @__PURE__ */ r("th", { className: "px-3 py-2", children: "Date" }),
        t.map((n) => /* @__PURE__ */ r("th", { className: "px-3 py-2", children: o[n] || n }, n)),
        /* @__PURE__ */ r("th", { className: "px-3 py-2 text-right", children: "Actions" })
      ] }) }),
      /* @__PURE__ */ r("tbody", { children: e.map((n, c) => /* @__PURE__ */ m("tr", { className: "border-b border-gray-200 dark:border-gray-600", children: [
        /* @__PURE__ */ r("td", { className: "px-3 py-2 whitespace-nowrap", children: W(n.time) }),
        t.map((l) => /* @__PURE__ */ r("td", { className: "px-3 py-2", children: X(n.values[l]) }, l)),
        /* @__PURE__ */ m("td", { className: "px-3 py-2 text-right whitespace-nowrap", children: [
          /* @__PURE__ */ r(
            "button",
            {
              type: "button",
              onClick: () => s(c),
              className: "mr-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300",
              title: "Edit",
              children: "✎"
            }
          ),
          /* @__PURE__ */ r(
            "button",
            {
              type: "button",
              onClick: () => a(c),
              className: "text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300",
              title: "Delete",
              children: "✕"
            }
          )
        ] })
      ] }, c)) })
    ] }) })
  ] });
}
const _ = I;
function ee() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function ge({ section: e, values: t, onSubmit: o, onDateChange: s, disabled: a, submitLabel: n, entries: c, onEditEntry: l, onDeleteEntry: i }) {
  const [d, u] = S(t || {}), [f, x] = S(ee());
  P(() => {
    u(t || {});
  }, [t]);
  const C = q(), b = e.type === "recurring";
  function E(p, h) {
    u((v) => ({ ...v, [p]: h }));
  }
  function F(p, h) {
    u((v) => ({ ...v, [`${p}__eventType`]: h }));
  }
  function D(p) {
    if (p.preventDefault(), b) {
      const h = Math.floor(new Date(f).getTime() / 1e3);
      o({ ...d, __time: h });
    } else
      o(d);
  }
  const T = {};
  for (const p of e.itemKeys) {
    const h = C.itemsDefs.forKey(p);
    h && (T[p] = _(h.data.label) || p);
  }
  return /* @__PURE__ */ m("form", { onSubmit: D, className: "space-y-6", children: [
    e.label && /* @__PURE__ */ r("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white", children: _(e.label) }),
    b && /* @__PURE__ */ m("div", { children: [
      /* @__PURE__ */ r("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: "Date" }),
      /* @__PURE__ */ r(
        "input",
        {
          type: "date",
          value: f,
          onChange: (p) => {
            x(p.target.value), s == null || s(p.target.value);
          },
          disabled: a,
          className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
        }
      )
    ] }),
    e.itemKeys.map((p) => {
      var j, y;
      const h = C.itemsDefs.forKey(p);
      if (!h) return null;
      const v = (y = (j = h.data) == null ? void 0 : j.variations) == null ? void 0 : y.eventType;
      return /* @__PURE__ */ m("div", { className: "space-y-2", children: [
        /* @__PURE__ */ r(
          Y,
          {
            itemData: h.data,
            value: d[p],
            onChange: (g) => E(p, g),
            disabled: a
          }
        ),
        v && /* @__PURE__ */ r(
          V,
          {
            label: _(v.label) || "",
            value: d[`${p}__eventType`],
            onChange: (g) => F(p, g),
            options: v.options.map((g) => ({
              value: g.value,
              label: _(g.label) || ""
            })),
            disabled: a
          }
        )
      ] }, p);
    }),
    /* @__PURE__ */ r(
      "button",
      {
        type: "submit",
        disabled: a,
        className: "rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:opacity-50 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800",
        children: n || (b ? "Add entry" : "Submit")
      }
    ),
    b && c && l && i && /* @__PURE__ */ r(
      Z,
      {
        entries: c,
        itemKeys: e.itemKeys,
        fieldLabels: T,
        onEdit: l,
        onDelete: i
      }
    )
  ] });
}
const O = I, te = { checkbox: re, date: ae, text: ne, number: oe, select: se, composite: le, "datasource-search": ce };
function A(e) {
  const t = {
    title: O(e.label) || ""
  };
  e.description != null && (t.description = O(e.description) || void 0);
  const o = te[e.type];
  if (o == null)
    throw new Error(`Cannot find schema for type: "${e.type}"`);
  return o(t, e), t;
}
function re(e, t) {
  e.type = "boolean";
}
function ae(e, t) {
  e.type = "string", e.format = "date", e.dateSaveFormat = "YYYY-MM-DD";
}
function ne(e, t) {
  e.type = "string", t.canBeNull !== !0 && (e.minLength = 1);
}
function oe(e, t) {
  e.type = "number";
}
function se(e, t) {
  const o = t, s = o.options.find((n) => isNaN(n.value)), a = o.options.map((n) => ({ const: n.value, title: O(n.label) || "" }));
  e.type = s ? "string" : "number", e.oneOf = a;
}
function ce(e, t) {
  e.type = "object";
}
function le(e, t) {
  const o = t;
  e.type = "object", e.properties = {}, e.required = [];
  for (const [s, a] of Object.entries(o.composite))
    e.properties[s] = A(a), a.canBeNull !== !0 && e.required.push(s);
}
const M = I;
function fe(e) {
  const t = ie(e);
  function o(s) {
    const a = structuredClone(s);
    if (t.processData && t.processData(a).createEvent === !1)
      return null;
    const n = e.eventTemplate();
    return Object.assign(n, a), n;
  }
  return { schema: t.schema, eventDataForFormData: o };
}
function ie(e) {
  var a, n;
  const t = e.data.type, o = A(e.data);
  if (t === "checkbox" && e.data.eventType === "activity/plain")
    return {
      schema: o,
      processData: (c) => c === !0 ? {} : { createEvent: !1 }
    };
  if (t === "select" && e.data.eventType === "ratio/generic") {
    const c = Math.max(...(e.data.options || []).map((l) => Number(l.value)));
    return {
      schema: {
        title: "",
        type: "object",
        properties: {
          content: {
            title: "",
            type: "object",
            properties: {
              value: o
            },
            required: ["value"]
          }
        }
      },
      processData: (l) => {
        const i = l;
        return i.content == null ? { createEvent: !1 } : (i.content.relativeTo = c, {});
      }
    };
  }
  const s = {
    schema: {
      title: "",
      type: "object",
      properties: {
        content: o
      },
      required: ["content"]
    }
  };
  if ((n = (a = e.data) == null ? void 0 : a.variations) != null && n.eventType) {
    const c = e.data.variations.eventType;
    s.schema.properties = {
      ...s.schema.properties,
      type: {
        title: M(c.label) || "",
        type: "string",
        oneOf: c.options.map((l) => ({ const: l.value, title: M(l.label) || "" }))
      }
    };
  }
  return s;
}
function de(e) {
  var s;
  if (e.data.eventType) return [e.data.eventType];
  const t = (s = e.data.variations) == null ? void 0 : s.eventType;
  if (t != null && t.options)
    return t.options.map((a) => a.value).filter(Boolean);
  const o = e.eventTemplate();
  return o.type ? [o.type] : [];
}
function he(e, t) {
  return ue(e, t).values;
}
function ue(e, t) {
  const o = {}, s = {}, a = {};
  for (const { key: n, itemDef: c } of e) {
    const l = de(c), i = c.data.streamId;
    if (l.length === 0 || !i) continue;
    const d = t.filter((u) => {
      var f;
      return l.includes(u.type) && ((f = u.streamIds) == null ? void 0 : f.includes(i));
    }).sort((u, f) => (f.time || 0) - (u.time || 0));
    if (d.length > 0) {
      const u = d[0];
      u.type === "activity/plain" ? o[n] = !0 : o[n] = u.content, u.id && (s[n] = u.id), a[n] = u.type;
    }
  }
  return { values: o, eventIds: s, eventTypes: a };
}
function be(e, t, o, s) {
  const a = [], n = s || Math.floor(Date.now() / 1e3);
  for (const { key: c, itemDef: l } of e) {
    const i = t[c], d = o[c], u = l.eventTemplate(), f = t[`${c}__eventType`] || u.type;
    if (f === "activity/plain") {
      if (i === !0) {
        if (d)
          continue;
        a.push({
          action: "create",
          key: c,
          params: {
            streamIds: u.streamIds,
            type: f,
            content: null,
            time: n
          }
        });
      } else
        d && a.push({ action: "delete", key: c, params: { id: d } });
      continue;
    }
    if (i == null || i === "") {
      d && a.push({ action: "delete", key: c, params: { id: d } });
      continue;
    }
    if (d) {
      const x = { content: i };
      t[`${c}__eventType`] && (x.type = f), a.push({
        action: "update",
        key: c,
        params: { id: d, update: x }
      });
    } else
      a.push({
        action: "create",
        key: c,
        params: {
          streamIds: u.streamIds,
          type: f,
          content: i,
          time: n
        }
      });
  }
  return a;
}
function xe(e, t, o) {
  const s = [], a = o || Math.floor(Date.now() / 1e3);
  for (const { key: n, itemDef: c } of e) {
    const l = t[n];
    if (l == null) continue;
    const i = c.eventTemplate(), d = i.type;
    if (d === "activity/plain") {
      if (l === !1) continue;
      s.push({
        streamIds: i.streamIds,
        type: d,
        content: null,
        time: a
      });
      continue;
    }
    s.push({
      streamIds: i.streamIds,
      type: d,
      content: l,
      time: a
    });
  }
  return s;
}
export {
  G as DatasetSearch,
  Z as EntryList,
  Y as HDSFormField,
  ge as HDSFormSection,
  be as formDataToActions,
  xe as formDataToEventBatch,
  fe as jsonFormForItemDef,
  ue as matchEventsToItemDefs,
  he as prefillFromEvents,
  A as schemaFor
};
