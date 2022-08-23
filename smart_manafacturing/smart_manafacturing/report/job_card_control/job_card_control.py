# Copyright (c) 2013, Peter Maged and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _




def execute(filters=None):
	columns, data = [], []
	columns = get_columns(filters)
	data=get_data(filters)
	return columns, data





def get_columns(filters):
	columns = [
		{
			"fieldname" : "item_ref",
			"label" : _("Item Ref"),
			"fieldtype":"Data",
			"width" : 150
		},
		{
			"fieldname" : "item_ref_name",
			"label" : _("Item Ref Name"),
			"fieldtype":"Data",
			"width" : 150
		},
		{
			"fieldname" : "operation",
			"label" : _("Operation"),
			"options" : "Operation",
			"fieldtype":"Link",
			"width" : 150
		},
		{
			"fieldname" : "job_card_draft_planned",
			"label" : _("Planned Job Card Qty (Draft)"),
			"fieldtype":"Data",
			"width" : 300
		},
		{
			"fieldname" : "job_card_draft_completed",
			"label" : _("Completed Job Card Qty (Draft)"),
			"fieldtype":"Data",
			"width" : 300
		},
		{
			"fieldname" : "job_card_submitted_planned",
			"label" : _("Planned Job Card Qty (Submitted)"),
			"fieldtype":"Data",
			"width" : 300
		},
		{
			"fieldname" : "job_card_submitted_completed",
			"label" : _("Completed Job Card Qty (Submitted)"),
			"fieldtype":"Data",
			"width" : 300
		},
	]

 
	return columns

def get_data(filters):
	result = []
	conditions = "  "
	data = filters.get("item_ref")
	if data :
		conditions += f" and item.item_ref = '{data}'" 
	data = filters.get("from_date")
	if data :
		conditions += f" and date(card.posting_date) >= date('{data}')" 
	data = filters.get("to_date")
	if data :
		conditions += f" and date(card.posting_date) <= date('{data}')" 
	data = filters.get("operation")
	if data :
		conditions += f" and card.operation = '{data}' " 




	sql = f""" SELECT
				sum(case when card.docstatus = 0 then card.for_quantity else 0 end) as 'job_card_draft_planned' ,
				sum(case when card.docstatus = 0 then card.total_completed_qty else 0 end) as 'job_card_draft_completed' ,
				sum(case when card.docstatus = 1 then card.for_quantity else 0 end) as 'job_card_submitted_planned' ,
				sum(case when card.docstatus = 1 then card.total_completed_qty else 0 end) as 'job_card_submitted_completed' ,
				card.operation ,
				item.item_ref,
				(select item_ref_name from `tabItem Ref Names` where item_ref = item.item_ref) as item_ref_name
		from `tabJob Card`  card inner join tabItem item on item.name = card.production_item
		where ifnull(item.item_ref ,'') <> '' and card.docstatus < 2
		{conditions}
		group by  item.item_ref, card.operation

	"""

	# frappe.msgprint(sql)
	result=frappe.db.sql(sql,as_dict=1)

	return result
