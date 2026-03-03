import { jsxs as u, jsx as r } from "react/jsx-runtime";
import { getHDSModel as V, localizeText as C } from "hds-lib";
import { useState as S, useRef as R, useEffect as B, useCallback as H } from "react";
function A({ label: e, description: t, value: n, onChange: o, disabled: l }) {
  return /* @__PURE__ */ u("div", { className: "flex items-start gap-3", children: [
    /* @__PURE__ */ r(
      "input",
      {
        type: "checkbox",
        checked: !!n,
        onChange: (a) => o(a.target.checked),
        disabled: l,
        className: "mt-1 h-4 w-4 rounded border-gray-300 bg-gray-100 text-primary-600 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-primary-600"
      }
    ),
    /* @__PURE__ */ u("div", { children: [
      /* @__PURE__ */ r("label", { className: "text-sm font-medium text-gray-900 dark:text-gray-300", children: e }),
      t && /* @__PURE__ */ r("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: t })
    ] })
  ] });
}
function Q({ label: e, description: t, value: n, onChange: o, required: l, disabled: a }) {
  return /* @__PURE__ */ u("div", { children: [
    /* @__PURE__ */ u("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      l && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ r(
      "input",
      {
        type: "date",
        value: n || "",
        onChange: (i) => o(i.target.value),
        required: l,
        disabled: a,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      }
    )
  ] });
}
function z({ label: e, description: t, value: n, onChange: o, required: l, disabled: a }) {
  return /* @__PURE__ */ u("div", { children: [
    /* @__PURE__ */ u("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      l && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ r(
      "input",
      {
        type: "text",
        value: n || "",
        onChange: (i) => o(i.target.value),
        required: l,
        disabled: a,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      }
    )
  ] });
}
function U({ label: e, description: t, value: n, onChange: o, required: l, disabled: a }) {
  return /* @__PURE__ */ u("div", { children: [
    /* @__PURE__ */ u("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      l && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ r(
      "input",
      {
        type: "number",
        value: n ?? "",
        onChange: (i) => o(i.target.value === "" ? null : Number(i.target.value)),
        required: l,
        disabled: a,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      }
    )
  ] });
}
function P({ label: e, description: t, value: n, onChange: o, options: l, required: a, disabled: i }) {
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
        onChange: (s) => {
          const c = s.target.value, p = Number(c);
          o(c === "" ? null : isNaN(p) ? c : p);
        },
        required: a,
        disabled: i,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500",
        children: [
          /* @__PURE__ */ r("option", { value: "", children: "--" }),
          l.map((s) => /* @__PURE__ */ r("option", { value: s.value, children: s.label }, String(s.value)))
        ]
      }
    )
  ] });
}
function J({ label: e, description: t, value: n, onChange: o, composite: l, disabled: a }) {
  const i = n || {};
  function s(c, p) {
    o({ ...i, [c]: p });
  }
  return /* @__PURE__ */ u("fieldset", { className: "rounded-lg border border-gray-200 p-4 dark:border-gray-600", children: [
    /* @__PURE__ */ r("legend", { className: "px-2 text-sm font-medium text-gray-900 dark:text-white", children: e }),
    t && /* @__PURE__ */ r("p", { className: "mb-3 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ r("div", { className: "space-y-4", children: Object.entries(l).map(([c, p]) => /* @__PURE__ */ r(
      Y,
      {
        itemData: p,
        value: i[c],
        onChange: (g) => s(c, g),
        disabled: a
      },
      c
    )) })
  ] });
}
const _ = C;
function G({ label: e, description: t, value: n, onChange: o, required: l, disabled: a, datasource: i }) {
  const s = V().datasources.forKey(i), c = s.minQueryLength || 3, [p, g] = S(""), [T, x] = S([]), [w, v] = S(!1), [L, F] = S(!1), D = R(null), m = R(null);
  B(() => {
    function d(f) {
      m.current && !m.current.contains(f.target) && v(!1);
    }
    return document.addEventListener("mousedown", d), () => document.removeEventListener("mousedown", d);
  }, []);
  const y = H(async (d) => {
    if (d.length < c) {
      x([]), v(!1);
      return;
    }
    F(!0);
    try {
      const f = `${s.endpoint}?${s.queryParam}=${encodeURIComponent(d)}`, k = (await (await fetch(f)).json())[s.resultKey] || [];
      x(k), v(k.length > 0);
    } catch (f) {
      console.error("DatasetSearch fetch error:", f), x([]), v(!1);
    } finally {
      F(!1);
    }
  }, [s, c]);
  function h(d) {
    g(d), D.current && clearTimeout(D.current), D.current = setTimeout(() => y(d), 300);
  }
  function j(d) {
    const f = {};
    for (const k of s.valueFields)
      d[k] !== void 0 && (f[k] = d[k]);
    o(f);
    const N = s.displayFields.label, b = d[N];
    g(typeof b == "object" ? _(b) || "" : String(b || "")), v(!1), x([]);
  }
  function I() {
    g(""), o(null), x([]), v(!1);
  }
  return /* @__PURE__ */ u("div", { ref: m, className: "relative", children: [
    /* @__PURE__ */ u("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      l && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ u("div", { className: "relative", children: [
      /* @__PURE__ */ r(
        "input",
        {
          type: "text",
          value: p,
          onChange: (d) => h(d.target.value),
          placeholder: `Type at least ${c} characters to search...`,
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
      const N = d[s.displayFields.label], b = d[s.displayFields.description], k = typeof N == "object" ? _(N) || N.en || "" : String(N || ""), K = typeof b == "object" ? _(b) || b.en || "" : String(b || "");
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
const $ = C;
function Y({ itemData: e, value: t, onChange: n, required: o, disabled: l }) {
  const a = $(e.label) || "", i = e.description && $(e.description) || void 0, s = o ?? e.canBeNull !== !0, c = { label: a, description: i, value: t, onChange: n, required: s, disabled: l };
  switch (e.type) {
    case "checkbox":
      return /* @__PURE__ */ r(A, { ...c });
    case "date":
      return /* @__PURE__ */ r(Q, { ...c });
    case "text":
      return /* @__PURE__ */ r(z, { ...c });
    case "number":
      return /* @__PURE__ */ r(U, { ...c });
    case "select": {
      const p = e.options.map((g) => ({
        value: g.value,
        label: $(g.label) || ""
      }));
      return /* @__PURE__ */ r(P, { ...c, options: p });
    }
    case "composite": {
      const p = e.composite;
      return /* @__PURE__ */ r(J, { ...c, composite: p });
    }
    case "datasource-search": {
      const p = e.datasource;
      return /* @__PURE__ */ r(G, { ...c, datasource: p });
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
function Z({ entries: e, itemKeys: t, fieldLabels: n, onEdit: o, onDelete: l }) {
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
        t.map((s) => /* @__PURE__ */ r("td", { className: "px-3 py-2", children: X(a.values[s]) }, s)),
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
              onClick: () => l(i),
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
function pe({ section: e, values: t, onSubmit: n, disabled: o, submitLabel: l, entries: a, onEditEntry: i, onDeleteEntry: s }) {
  const [c, p] = S(t || {}), [g, T] = S(ee()), x = V(), w = e.type === "recurring";
  function v(m, y) {
    p((h) => ({ ...h, [m]: y }));
  }
  function L(m, y) {
    p((h) => ({ ...h, [`${m}__eventType`]: y }));
  }
  function F(m) {
    if (m.preventDefault(), w) {
      const y = Math.floor(new Date(g).getTime() / 1e3);
      n({ ...c, __time: y });
    } else
      n(c);
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
      const h = (I = (j = y.data) == null ? void 0 : j.variations) == null ? void 0 : I.eventType;
      return /* @__PURE__ */ u("div", { className: "space-y-2", children: [
        /* @__PURE__ */ r(
          Y,
          {
            itemData: y.data,
            value: c[m],
            onChange: (d) => v(m, d),
            disabled: o
          }
        ),
        h && /* @__PURE__ */ r(
          P,
          {
            label: E(h.label) || "",
            value: c[`${m}__eventType`],
            onChange: (d) => L(m, d),
            options: h.options.map((d) => ({
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
        children: l || (w ? "Add entry" : "Submit")
      }
    ),
    w && a && i && s && /* @__PURE__ */ r(
      Z,
      {
        entries: a,
        itemKeys: e.itemKeys,
        fieldLabels: D,
        onEdit: i,
        onDelete: s
      }
    )
  ] });
}
const O = C, te = { checkbox: re, date: ae, text: ne, number: oe, select: se, composite: ce, "datasource-search": le };
function q(e) {
  const t = {
    title: O(e.label) || ""
  };
  e.description != null && (t.description = O(e.description) || void 0);
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
  const n = t, o = n.options.find((a) => isNaN(a.value)), l = n.options.map((a) => ({ const: a.value, title: O(a.label) || "" }));
  e.type = o ? "string" : "number", e.oneOf = l;
}
function le(e, t) {
  e.type = "object";
}
function ce(e, t) {
  const n = t;
  e.type = "object", e.properties = {}, e.required = [];
  for (const [o, l] of Object.entries(n.composite))
    e.properties[o] = q(l), l.canBeNull !== !0 && e.required.push(o);
}
const M = C;
function ye(e) {
  const t = ie(e);
  function n(o) {
    const l = structuredClone(o);
    if (t.processData && t.processData(l).createEvent === !1)
      return null;
    const a = e.eventTemplate();
    return Object.assign(a, l), a;
  }
  return { schema: t.schema, eventDataForFormData: n };
}
function ie(e) {
  var l, a;
  const t = e.data.type, n = q(e.data);
  if (t === "checkbox" && e.data.eventType === "activity/plain")
    return {
      schema: n,
      processData: (i) => i === !0 ? {} : { createEvent: !1 }
    };
  if (t === "select" && e.data.eventType === "ratio/generic") {
    const i = Math.max(...(e.data.options || []).map((s) => Number(s.value)));
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
      processData: (s) => {
        const c = s;
        return c.content == null ? { createEvent: !1 } : (c.content.relativeTo = i, {});
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
  if ((a = (l = e.data) == null ? void 0 : l.variations) != null && a.eventType) {
    const i = e.data.variations.eventType;
    o.schema.properties = {
      ...o.schema.properties,
      type: {
        title: M(i.label) || "",
        type: "string",
        oneOf: i.options.map((s) => ({ const: s.value, title: M(s.label) || "" }))
      }
    };
  }
  return o;
}
function ge(e, t) {
  const n = {};
  for (const { key: o, itemDef: l } of e) {
    const a = l.data.eventType, i = l.data.streamId;
    if (!a || !i) continue;
    const s = t.filter((c) => c.type === a && c.streamIds.includes(i)).sort((c, p) => (p.time || 0) - (c.time || 0));
    s.length > 0 && (n[o] = s[0].content);
  }
  return n;
}
function fe(e, t, n) {
  const o = [], l = n || Math.floor(Date.now() / 1e3);
  for (const { key: a, itemDef: i } of e) {
    const s = t[a];
    if (s == null) continue;
    const c = i.eventTemplate();
    o.push({
      streamIds: c.streamIds,
      type: c.type,
      content: s,
      time: l
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
