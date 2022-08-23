// Copyright (c) 2016, Peter Maged and contributors
// For license information, please see license.txt
/* eslint-disable */

frappe.query_reports["Item Reference Report"] = {
  filters: [
    {
      fieldname: "company",
      label: "Company",
      fieldtype: "Link",
      options: "Company",
	  default: frappe.defaults.get_user_default("Company"),
	  reqd : 1
    },
	{
		fieldname: "item_ref",
		label: "Item Ref",
		fieldtype: "Data",
		//options: "Company",
		reqd : 1

	},
    {
      fieldname: "from_date",
      label: "From Date",
      fieldtype: "Date",
      default: new Date(),
	  reqd : 1

    },
    {
      fieldname: "to_date",
      label: "To Date",
      fieldtype: "Date",
      default:  new Date(),
	  reqd : 1

    },
  ],
};
