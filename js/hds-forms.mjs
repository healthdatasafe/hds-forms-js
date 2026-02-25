import { jsxs as d, jsx as r } from "react/jsx-runtime";
import { localizeText as x, getHDSModel as V } from "hds-lib";
import { useState as C } from "react";
function $({ label: e, description: t, value: n, onChange: o, disabled: s }) {
  return /* @__PURE__ */ d("div", { className: "flex items-start gap-3", children: [
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
    /* @__PURE__ */ d("div", { children: [
      /* @__PURE__ */ r("label", { className: "text-sm font-medium text-gray-900 dark:text-gray-300", children: e }),
      t && /* @__PURE__ */ r("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: t })
    ] })
  ] });
}
function K({ label: e, description: t, value: n, onChange: o, required: s, disabled: a }) {
  return /* @__PURE__ */ d("div", { children: [
    /* @__PURE__ */ d("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      s && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ r(
      "input",
      {
        type: "date",
        value: n || "",
        onChange: (l) => o(l.target.value),
        required: s,
        disabled: a,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      }
    )
  ] });
}
function Y({ label: e, description: t, value: n, onChange: o, required: s, disabled: a }) {
  return /* @__PURE__ */ d("div", { children: [
    /* @__PURE__ */ d("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      s && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ r(
      "input",
      {
        type: "text",
        value: n || "",
        onChange: (l) => o(l.target.value),
        required: s,
        disabled: a,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      }
    )
  ] });
}
function B({ label: e, description: t, value: n, onChange: o, required: s, disabled: a }) {
  return /* @__PURE__ */ d("div", { children: [
    /* @__PURE__ */ d("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      s && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ r(
      "input",
      {
        type: "number",
        value: n ?? "",
        onChange: (l) => o(l.target.value === "" ? null : Number(l.target.value)),
        required: s,
        disabled: a,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
      }
    )
  ] });
}
function F({ label: e, description: t, value: n, onChange: o, options: s, required: a, disabled: l }) {
  return /* @__PURE__ */ d("div", { children: [
    /* @__PURE__ */ d("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: [
      e,
      a && /* @__PURE__ */ r("span", { className: "text-red-500", children: " *" })
    ] }),
    t && /* @__PURE__ */ r("p", { className: "mb-1 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ d(
      "select",
      {
        value: n ?? "",
        onChange: (i) => {
          const c = i.target.value, m = Number(c);
          o(c === "" ? null : isNaN(m) ? c : m);
        },
        required: a,
        disabled: l,
        className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500",
        children: [
          /* @__PURE__ */ r("option", { value: "", children: "--" }),
          s.map((i) => /* @__PURE__ */ r("option", { value: i.value, children: i.label }, String(i.value)))
        ]
      }
    )
  ] });
}
function H({ label: e, description: t, value: n, onChange: o, composite: s, disabled: a }) {
  const l = n || {};
  function i(c, m) {
    o({ ...l, [c]: m });
  }
  return /* @__PURE__ */ d("fieldset", { className: "rounded-lg border border-gray-200 p-4 dark:border-gray-600", children: [
    /* @__PURE__ */ r("legend", { className: "px-2 text-sm font-medium text-gray-900 dark:text-white", children: e }),
    t && /* @__PURE__ */ r("p", { className: "mb-3 text-sm text-gray-500 dark:text-gray-400", children: t }),
    /* @__PURE__ */ r("div", { className: "space-y-4", children: Object.entries(s).map(([c, m]) => /* @__PURE__ */ r(
      j,
      {
        itemData: m,
        value: l[c],
        onChange: (y) => i(c, y),
        disabled: a
      },
      c
    )) })
  ] });
}
const v = x;
function j({ itemData: e, value: t, onChange: n, required: o, disabled: s }) {
  const a = v(e.label) || "", l = e.description && v(e.description) || void 0, i = o ?? e.canBeNull !== !0, c = { label: a, description: l, value: t, onChange: n, required: i, disabled: s };
  switch (e.type) {
    case "checkbox":
      return /* @__PURE__ */ r($, { ...c });
    case "date":
      return /* @__PURE__ */ r(K, { ...c });
    case "text":
      return /* @__PURE__ */ r(Y, { ...c });
    case "number":
      return /* @__PURE__ */ r(B, { ...c });
    case "select": {
      const m = e.options.map((y) => ({
        value: y.value,
        label: v(y.label) || ""
      }));
      return /* @__PURE__ */ r(F, { ...c, options: m });
    }
    case "composite": {
      const m = e.composite;
      return /* @__PURE__ */ r(H, { ...c, composite: m });
    }
    default:
      return /* @__PURE__ */ d("div", { className: "text-sm text-red-500", children: [
        "Unknown field type: ",
        e.type
      ] });
  }
}
function L(e) {
  return new Date(e * 1e3).toLocaleDateString(void 0, { year: "numeric", month: "short", day: "numeric" });
}
function P(e) {
  return e == null ? "—" : typeof e == "boolean" ? e ? "✓" : "✗" : typeof e == "object" ? JSON.stringify(e) : String(e);
}
function A({ entries: e, itemKeys: t, fieldLabels: n, onEdit: o, onDelete: s }) {
  return e.length === 0 ? null : /* @__PURE__ */ d("div", { className: "mt-4", children: [
    /* @__PURE__ */ r("h4", { className: "mb-2 text-sm font-medium text-gray-700 dark:text-gray-300", children: "Previous entries" }),
    /* @__PURE__ */ r("div", { className: "overflow-x-auto", children: /* @__PURE__ */ d("table", { className: "w-full text-left text-sm text-gray-700 dark:text-gray-300", children: [
      /* @__PURE__ */ r("thead", { className: "bg-gray-50 text-xs uppercase text-gray-600 dark:bg-gray-700 dark:text-gray-400", children: /* @__PURE__ */ d("tr", { children: [
        /* @__PURE__ */ r("th", { className: "px-3 py-2", children: "Date" }),
        t.map((a) => /* @__PURE__ */ r("th", { className: "px-3 py-2", children: n[a] || a }, a)),
        /* @__PURE__ */ r("th", { className: "px-3 py-2 text-right", children: "Actions" })
      ] }) }),
      /* @__PURE__ */ r("tbody", { children: e.map((a, l) => /* @__PURE__ */ d("tr", { className: "border-b border-gray-200 dark:border-gray-600", children: [
        /* @__PURE__ */ r("td", { className: "px-3 py-2 whitespace-nowrap", children: L(a.time) }),
        t.map((i) => /* @__PURE__ */ r("td", { className: "px-3 py-2", children: P(a.values[i]) }, i)),
        /* @__PURE__ */ d("td", { className: "px-3 py-2 text-right whitespace-nowrap", children: [
          /* @__PURE__ */ r(
            "button",
            {
              type: "button",
              onClick: () => o(l),
              className: "mr-2 text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-300",
              title: "Edit",
              children: "✎"
            }
          ),
          /* @__PURE__ */ r(
            "button",
            {
              type: "button",
              onClick: () => s(l),
              className: "text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300",
              title: "Delete",
              children: "✕"
            }
          )
        ] })
      ] }, l)) })
    ] }) })
  ] });
}
const h = x;
function R() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function re({ section: e, values: t, onSubmit: n, disabled: o, submitLabel: s, entries: a, onEditEntry: l, onDeleteEntry: i }) {
  const [c, m] = C(t || {}), [y, I] = C(R()), N = V(), b = e.type === "recurring";
  function E(u, p) {
    m((g) => ({ ...g, [u]: p }));
  }
  function O(u, p) {
    m((g) => ({ ...g, [`${u}__eventType`]: p }));
  }
  function M(u) {
    if (u.preventDefault(), b) {
      const p = Math.floor(new Date(y).getTime() / 1e3);
      n({ ...c, __time: p });
    } else
      n(c);
  }
  const w = {};
  for (const u of e.itemKeys) {
    const p = N.itemsDefs.forKey(u);
    p && (w[u] = h(p.data.label) || u);
  }
  return /* @__PURE__ */ d("form", { onSubmit: M, className: "space-y-6", children: [
    e.label && /* @__PURE__ */ r("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white", children: h(e.label) }),
    b && /* @__PURE__ */ d("div", { children: [
      /* @__PURE__ */ r("label", { className: "mb-1 block text-sm font-medium text-gray-900 dark:text-white", children: "Date" }),
      /* @__PURE__ */ r(
        "input",
        {
          type: "date",
          value: y,
          onChange: (u) => I(u.target.value),
          disabled: o,
          className: "block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
        }
      )
    ] }),
    e.itemKeys.map((u) => {
      var D, T;
      const p = N.itemsDefs.forKey(u);
      if (!p) return null;
      const g = (T = (D = p.data) == null ? void 0 : D.variations) == null ? void 0 : T.eventType;
      return /* @__PURE__ */ d("div", { className: "space-y-2", children: [
        /* @__PURE__ */ r(
          j,
          {
            itemData: p.data,
            value: c[u],
            onChange: (f) => E(u, f),
            disabled: o
          }
        ),
        g && /* @__PURE__ */ r(
          F,
          {
            label: h(g.label) || "",
            value: c[`${u}__eventType`],
            onChange: (f) => O(u, f),
            options: g.options.map((f) => ({
              value: f.value,
              label: h(f.label) || ""
            })),
            disabled: o
          }
        )
      ] }, u);
    }),
    /* @__PURE__ */ r(
      "button",
      {
        type: "submit",
        disabled: o,
        className: "rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-300 disabled:opacity-50 dark:bg-primary-600 dark:hover:bg-primary-700 dark:focus:ring-primary-800",
        children: s || (b ? "Add entry" : "Submit")
      }
    ),
    b && a && l && i && /* @__PURE__ */ r(
      A,
      {
        entries: a,
        itemKeys: e.itemKeys,
        fieldLabels: w,
        onEdit: l,
        onDelete: i
      }
    )
  ] });
}
const k = x, q = { checkbox: z, date: J, text: U, number: G, select: Q, composite: W };
function _(e) {
  const t = {
    title: k(e.label) || ""
  };
  e.description != null && (t.description = k(e.description) || void 0);
  const n = q[e.type];
  if (n == null)
    throw new Error(`Cannot find schema for type: "${e.type}"`);
  return n(t, e), t;
}
function z(e, t) {
  e.type = "boolean";
}
function J(e, t) {
  e.type = "string", e.format = "date", e.dateSaveFormat = "YYYY-MM-DD";
}
function U(e, t) {
  e.type = "string", t.canBeNull !== !0 && (e.minLength = 1);
}
function G(e, t) {
  e.type = "number";
}
function Q(e, t) {
  const n = t, o = n.options.find((a) => isNaN(a.value)), s = n.options.map((a) => ({ const: a.value, title: k(a.label) || "" }));
  e.type = o ? "string" : "number", e.oneOf = s;
}
function W(e, t) {
  const n = t;
  e.type = "object", e.properties = {}, e.required = [];
  for (const [o, s] of Object.entries(n.composite))
    e.properties[o] = _(s), s.canBeNull !== !0 && e.required.push(o);
}
const S = x;
function ae(e) {
  const t = X(e);
  function n(o) {
    const s = structuredClone(o);
    if (t.processData && t.processData(s).createEvent === !1)
      return null;
    const a = e.eventTemplate();
    return Object.assign(a, s), a;
  }
  return { schema: t.schema, eventDataForFormData: n };
}
function X(e) {
  var s, a;
  const t = e.data.type, n = _(e.data);
  if (t === "checkbox" && e.data.eventType === "activity/plain")
    return {
      schema: n,
      processData: (l) => l === !0 ? {} : { createEvent: !1 }
    };
  if (t === "select" && e.data.eventType === "ratio/generic") {
    const l = Math.max(...Object.keys(e.data.options || {}).map(Number));
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
      processData: (i) => {
        const c = i;
        return c.content == null ? { createEvent: !1 } : (c.content.relativeTo = l, {});
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
    const l = e.data.variations.eventType;
    o.schema.properties = {
      ...o.schema.properties,
      type: {
        title: S(l.label) || "",
        type: "string",
        oneOf: l.options.map((i) => ({ const: i.value, title: S(i.label) || "" }))
      }
    };
  }
  return o;
}
function ne(e, t) {
  const n = {};
  for (const { key: o, itemDef: s } of e) {
    const a = s.data.eventType, l = s.data.streamId;
    if (!a || !l) continue;
    const i = t.filter((c) => c.type === a && c.streamIds.includes(l)).sort((c, m) => (m.time || 0) - (c.time || 0));
    i.length > 0 && (n[o] = i[0].content);
  }
  return n;
}
function oe(e, t, n) {
  const o = [], s = n || Math.floor(Date.now() / 1e3);
  for (const { key: a, itemDef: l } of e) {
    const i = t[a];
    if (i == null) continue;
    const c = l.eventTemplate();
    o.push({
      streamIds: c.streamIds,
      type: c.type,
      content: i,
      time: s
    });
  }
  return o;
}
export {
  A as EntryList,
  j as HDSFormField,
  re as HDSFormSection,
  oe as formDataToEventBatch,
  ae as jsonFormForItemDef,
  ne as prefillFromEvents,
  _ as schemaFor
};
