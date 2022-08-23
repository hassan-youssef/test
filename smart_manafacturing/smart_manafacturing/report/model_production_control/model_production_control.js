// Copyright (c) 2016, Peter Maged and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Model Production control"] = {
  filters: [
    {
      fieldname: "from_date",
      fieldtype: "Date",
      label: __("From Date"),
      default: frappe.datetime.add_months(frappe.datetime.get_today(), -1),
      reqd: 1,
    },
    {
      fieldname: "to_date",
      fieldtype: "Date",
      label: __("To Date"),
      default: frappe.datetime.get_today(),
      reqd: 1,
    },
    {
      fieldname: "item_ref",
      fieldtype: "Data",
      label: __("Item Ref"),
    },
  ],
};
