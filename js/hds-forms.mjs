import { jsxs as u, jsx as r } from "react/jsx-runtime";
import { getHDSModel as V, localizeText as C } from "hds-lib";
import { useState as S, useRef as R, useEffect as B, useCallback as H } from "react";
function A({ label: e, description: t, value: n, onChange: o, disabled: s }) {
  return /* @__PURE__ */ u("div", { className: "flex items-start gap-3", children: [
    /* @__PURE__ */ r(
      "input",
      {
        type: "checkbox",
        checked: !!n,
        onChange: (a) => o(a.target.checked),
        disabled: s,
        className: "mt-1 h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
      }
    ),
    /* @__PURE__ */ u("div", { children: [
      /* @__PURE__ */ r("label", { className: "text-sm font-medium text-gray-900 dark:text-gray-300", children: e }),
      t && /* @__PURE__ */ r("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: t })
    ] })
  ] });
}
function Q({ label: e, description: t, value: n, onChange: o, required: s, disabled: a }) {
  return /* @__PURE__ */ u("div", { children: [
    /* @__PURE__ */ u("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      s && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ r(
      "input",
      {
        type: "date",
        value: n || "",
        onChange: (i) => o(i.target.value),
        required: s,
        disabled: a,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      }
    )
  ] });
}
function z({ label: e, description: t, value: n, onChange: o, required: s, disabled: a }) {
  return /* @__PURE__ */ u("div", { children: [
    /* @__PURE__ */ u("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      s && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ r(
      "input",
      {
        type: "text",
        value: n || "",
        onChange: (i) => o(i.target.value),
        required: s,
        disabled: a,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      }
    )
  ] });
}
function U({ label: e, description: t, value: n, onChange: o, required: s, disabled: a }) {
  return /* @__PURE__ */ u("div", { children: [
    /* @__PURE__ */ u("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      s && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ r(
      "input",
      {
        type: "number",
        value: n ?? "",
        onChange: (i) => o(i.target.value === "" ? null : Number(i.target.value)),
        required: s,
        disabled: a,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      }
    )
  ] });
}
function P({ label: e, description: t, value: n, onChange: o, options: s, required: a, disabled: i }) {
  return /* @__PURE__ */ u("div", { children: [
    /* @__PURE__ */ u("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      a && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ u(
      "select",
      {
        value: n ?? "",
        onChange: (c) => {
          const l = c.target.value, p = Number(l);
          o(l === "" ? null : isNaN(p) ? l : p);
        },
        required: a,
        disabled: i,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500",
        children: [
          /* @__PURE__ */ r("option", { value: "", children: "--" }),
          s.map((c) => /* @__PURE__ */ r("option", { value: c.value, children: c.label }, String(c.value)))
        ]
      }
    )
  ] });
}
function J({ label: e, description: t, value: n, onChange: o, composite: s, disabled: a }) {
  const i = n || {};
  function c(l, p) {
    o({ ...i, [l]: p });
  }
  return /* @__PURE__ */ u("fieldset", { className: "rounded-lg border border-gray-200 p-4 dark:border-gray-600", children: [
    /* @__PURE__ */ r("legend", { className: "px-2 text-sm font-medium text-gray-900 dark:text-white", children: e }),
    t && /* @__PURE__ */ r("p", { className: "mb-3 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ r("div", { className: "space-y-4", children: Object.entries(s).map(([l, p]) => /* @__PURE__ */ r(
      Y,
      {
        itemData: p,
        value: i[l],
        onChange: (g) => c(l, g),
        disabled: a
      },
      l
    )) })
  ] });
}
const _ = C;
function G({ label: e, description: t, value: n, onChange: o, required: s, disabled: a, datasource: i }) {
  const c = V().datasources.forKey(i), l = c.minQueryLength || 3, [p, g] = S(""), [T, x] = S([]), [w, v] = S(!1), [L, F] = S(!1), D = R(null), m = R(null);
  B(() => {
    function d(f) {
      m.current && !m.current.contains(f.target) && v(!1);
    }
    return document.addEventListener("mousedown", d), () => document.removeEventListener("mousedown", d);
  }, []);
  const y = H(async (d) => {
    if (d.length < l) {
      x([]), v(!1);
      return;
    }
    F(!0);
    try {
      const f = `${c.endpoint}?${c.queryParam}=${encodeURIComponent(d)}`, k = (await (await fetch(f)).json())[c.resultKey] || [];
      x(k), v(k.length > 0);
    } catch (f) {
      console.error("DatasetSearch fetch error:", f), x([]), v(!1);
    } finally {
      F(!1);
    }
  }, [c, l]);
  function b(d) {
    g(d), D.current && clearTimeout(D.current), D.current = setTimeout(() => y(d), 300);
  }
  function j(d) {
    const f = {};
    for (const k of c.valueFields)
      d[k] !== void 0 && (f[k] = d[k]);
    o(f);
    const N = c.displayFields.label, h = d[N];
    g(typeof h == "object" ? _(h) || "" : String(h || "")), v(!1), x([]);
  }
  function I() {
    g(""), o(null), x([]), v(!1);
  }
  return /* @__PURE__ */ u("div", { ref: m, className: "relative", children: [
    /* @__PURE__ */ u("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      s && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ u("div", { className: "relative", children: [
      /* @__PURE__ */ r(
        "input",
        {
          type: "text",
          value: p,
          onChange: (d) => b(d.target.value),
          placeholder: `Type at least ${l} characters to search...`,
          disabled: a,
          className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 pr-8 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
        }
      ),
      (p || n) && !a && /* @__PURE__ */ r(
        "button",
        {
          type: "button",
          onClick: I,
          className: "absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
          children: "×"
        }
      )
    ] }),
    L && /* @__PURE__ */ r("div", { className: "mt-1 text-xs text-gray-500 dark:text-gray-400", children: "Searching..." }),
    w && T.length > 0 && /* @__PURE__ */ r("ul", { className: "absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700", children: T.map((d, f) => {
      const N = d[c.displayFields.label], h = d[c.displayFields.description], k = typeof N == "object" ? _(N) || N.en || "" : String(N || ""), K = typeof h == "object" ? _(h) || h.en || "" : String(h || "");
      return /* @__PURE__ */ u(
        "li",
        {
          onClick: () => j(d),
          className: "cursor-pointer border-b border-gray-100 px-3 py-2 last:border-0 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-600",
          children: [
            /* @__PURE__ */ r("div", { className: "text-sm font-medium text-gray-900 dark:text-white", children: k }),
            K && /* @__PURE__ */ r("div", { className: "text-xs text-gray-500 dark:text-gray-400", children: K })
          ]
        },
        f
      );
    }) })
  ] });
}
const O = C;
function Y({ itemData: e, value: t, onChange: n, required: o, disabled: s }) {
  const a = O(e.label) || "", i = e.description && O(e.description) || void 0, c = o ?? e.canBeNull !== !0, l = { label: a, description: i, value: t, onChange: n, required: c, disabled: s };
  switch (e.type) {
    case "checkbox":
      return /* @__PURE__ */ r(A, { ...l });
    case "date":
      return /* @__PURE__ */ r(Q, { ...l });
    case "text":
      return /* @__PURE__ */ r(z, { ...l });
    case "number":
      return /* @__PURE__ */ r(U, { ...l });
    case "select": {
      const p = e.options.map((g) => ({
        value: g.value,
        label: O(g.label) || ""
      }));
      return /* @__PURE__ */ r(P, { ...l, options: p });
    }
    case "composite": {
      const p = e.composite;
      return /* @__PURE__ */ r(J, { ...l, composite: p });
    }
    case "datasource-search": {
      const p = e.datasource;
      return /* @__PURE__ */ r(G, { ...l, datasource: p });
    }
    default:
      return /* @__PURE__ */ u("div", { className: "text-sm text-red-500", children: [
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
function Z({ entries: e, itemKeys: t, fieldLabels: n, onEdit: o, onDelete: s }) {
  return e.length === 0 ? null : /* @__PURE__ */ u("div", { className: "mt-4", children: [
    /* @__PURE__ */ r("h4", { className: "mb-2 text-sm font-medium text-gray-700 dark:text-gray-300", children: "Previous entries" }),
    /* @__PURE__ */ r("div", { className: "overflow-x-auto", children: /* @__PURE__ */ u("table", { className: "w-full text-left text-sm text-gray-700 dark:text-gray-300", children: [
      /* @__PURE__ */ r("thead", { className: "bg-gray-50 text-xs uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-400", children: /* @__PURE__ */ u("tr", { children: [
        /* @__PURE__ */ r("th", { className: "px-3 py-2", children: "Date" }),
        t.map((a) => /* @__PURE__ */ r("th", { className: "px-3 py-2", children: n[a] || a }, a)),
        /* @__PURE__ */ r("th", { className: "px-3 py-2 text-right", children: "Actions" })
      ] }) }),
      /* @__PURE__ */ r("tbody", { children: e.map((a, i) => /* @__PURE__ */ u("tr", { className: "border-b border-gray-200 dark:border-gray-600", children: [
        /* @__PURE__ */ r("td", { className: "px-3 py-2 whitespace-nowrap", children: W(a.time) }),
        t.map((c) => /* @__PURE__ */ r("td", { className: "px-3 py-2", children: X(a.values[c]) }, c)),
        /* @__PURE__ */ u("td", { className: "px-3 py-2 text-right whitespace-nowrap", children: [
          /* @__PURE__ */ r(
            "button",
            {
              type: "button",
              onClick: () => o(i),
              className: "mr-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300",
              title: "Edit",
              children: "✎"
            }
          ),
          /* @__PURE__ */ r(
            "button",
            {
              type: "button",
              onClick: () => s(i),
              className: "text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300",
              title: "Delete",
              children: "✕"
            }
          )
        ] })
      ] }, i)) })
    ] }) })
  ] });
}
const E = C;
function ee() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function pe({ section: e, values: t, onSubmit: n, disabled: o, submitLabel: s, entries: a, onEditEntry: i, onDeleteEntry: c }) {
  const [l, p] = S(t || {}), [g, T] = S(ee()), x = V(), w = e.type === "recurring";
  function v(m, y) {
    p((b) => ({ ...b, [m]: y }));
  }
  function L(m, y) {
    p((b) => ({ ...b, [`${m}__eventType`]: y }));
  }
  function F(m) {
    if (m.preventDefault(), w) {
      const y = Math.floor(new Date(g).getTime() / 1e3);
      n({ ...l, __time: y });
    } else
      n(l);
  }
  const D = {};
  for (const m of e.itemKeys) {
    const y = x.itemsDefs.forKey(m);
    y && (D[m] = E(y.data.label) || m);
  }
  return /* @__PURE__ */ u("form", { onSubmit: F, className: "space-y-6", children: [
    e.label && /* @__PURE__ */ r("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white", children: E(e.label) }),
    w && /* @__PURE__ */ u("div", { children: [
      /* @__PURE__ */ r("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: "Date" }),
      /* @__PURE__ */ r(
        "input",
        {
          type: "date",
          value: g,
          onChange: (m) => T(m.target.value),
          disabled: o,
          className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
        }
      )
    ] }),
    e.itemKeys.map((m) => {
      var j, I;
      const y = x.itemsDefs.forKey(m);
      if (!y) return null;
      const b = (I = (j = y.data) == null ? void 0 : j.variations) == null ? void 0 : I.eventType;
      return /* @__PURE__ */ u("div", { className: "space-y-2", children: [
        /* @__PURE__ */ r(
          Y,
          {
            itemData: y.data,
            value: l[m],
            onChange: (d) => v(m, d),
            disabled: o
          }
        ),
        b && /* @__PURE__ */ r(
          P,
          {
            label: E(b.label) || "",
            value: l[`${m}__eventType`],
            onChange: (d) => L(m, d),
            options: b.options.map((d) => ({
              value: d.value,
              label: E(d.label) || ""
            })),
            disabled: o
          }
        )
      ] }, m);
    }),
    /* @__PURE__ */ r(
      "button",
      {
        type: "submit",
        disabled: o,
        className: "rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:opacity-50 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800",
        children: s || (w ? "Add entry" : "Submit")
      }
    ),
    w && a && i && c && /* @__PURE__ */ r(
      Z,
      {
        entries: a,
        itemKeys: e.itemKeys,
        fieldLabels: D,
        onEdit: i,
        onDelete: c
      }
    )
  ] });
}
const $ = C, te = { checkbox: re, date: ae, text: ne, number: oe, select: se, composite: le, "datasource-search": ce };
function q(e) {
  const t = {
    title: $(e.label) || ""
  };
  e.description != null && (t.description = $(e.description) || void 0);
  const n = te[e.type];
  if (n == null)
    throw new Error(`Cannot find schema for type: "${e.type}"`);
  return n(t, e), t;
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
  const n = t, o = n.options.find((a) => isNaN(a.value)), s = n.options.map((a) => ({ const: a.value, title: $(a.label) || "" }));
  e.type = o ? "string" : "number", e.oneOf = s;
}
function ce(e, t) {
  e.type = "object";
}
function le(e, t) {
  const n = t;
  e.type = "object", e.properties = {}, e.required = [];
  for (const [o, s] of Object.entries(n.composite))
    e.properties[o] = q(s), s.canBeNull !== !0 && e.required.push(o);
}
const M = C;
function ye(e) {
  const t = ie(e);
  function n(o) {
    const s = structuredClone(o);
    if (t.processData && t.processData(s).createEvent === !1)
      return null;
    const a = e.eventTemplate();
    return Object.assign(a, s), a;
  }
  return { schema: t.schema, eventDataForFormData: n };
}
function ie(e) {
  var s, a;
  const t = e.data.type, n = q(e.data);
  if (t === "checkbox" && e.data.eventType === "activity/plain")
    return {
      schema: n,
      processData: (i) => i === !0 ? {} : { createEvent: !1 }
    };
  if (t === "select" && e.data.eventType === "ratio/generic") {
    const i = Math.max(...Object.keys(e.data.options || {}).map(Number));
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
      processData: (c) => {
        const l = c;
        return l.content == null ? { createEvent: !1 } : (l.content.relativeTo = i, {});
      }
    };
  }
  const o = {
    schema: {
      title: "",
      type: "object",
      properties: {
        content: n
      },
      required: ["content"]
    }
  };
  if ((a = (s = e.data) == null ? void 0 : s.variations) != null && a.eventType) {
    const i = e.data.variations.eventType;
    o.schema.properties = {
      ...o.schema.properties,
      type: {
        title: M(i.label) || "",
        type: "string",
        oneOf: i.options.map((c) => ({ const: c.value, title: M(c.label) || "" }))
      }
    };
  }
  return o;
}
function ge(e, t) {
  const n = {};
  for (const { key: o, itemDef: s } of e) {
    const a = s.data.eventType, i = s.data.streamId;
    if (!a || !i) continue;
    const c = t.filter((l) => l.type === a && l.streamIds.includes(i)).sort((l, p) => (p.time || 0) - (l.time || 0));
    c.length > 0 && (n[o] = c[0].content);
  }
  return n;
}
function fe(e, t, n) {
  const o = [], s = n || Math.floor(Date.now() / 1e3);
  for (const { key: a, itemDef: i } of e) {
    const c = t[a];
    if (c == null) continue;
    const l = i.eventTemplate();
    o.push({
      streamIds: l.streamIds,
      type: l.type,
      content: c,
      time: s
    });
  }
  return o;
}
export {
  G as DatasetSearch,
  Z as EntryList,
  Y as HDSFormField,
  pe as HDSFormSection,
  fe as formDataToEventBatch,
  ye as jsonFormForItemDef,
  ge as prefillFromEvents,
  q as schemaFor
};
