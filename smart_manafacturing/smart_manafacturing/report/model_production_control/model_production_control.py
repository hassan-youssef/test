# Copyright (c) 2013, Peter Maged and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _

"""

frappe.listview_settings['Job Card'] = {
	get_indicator: function(doc) {
		if (doc.status === "Work In Progress") {
			return [__("Work In Progress"), "orange", "status,=,Work In Progress"];
		} else if (doc.status === "Completed") {
			return [__("Completed"), "green", "status,=,Completed"];
		} else if (doc.docstatus == 2) {
			return [__("Cancelled"), "red", "status,=,Cancelled"];
		} else if (doc.status === "Material Transferred") {
			return [__('Material Transferred'), "blue", "status,=,Material Transferred"];
		} else {
			return [__("Open"), "red", "status,=,Open"];
		}
	}
};

"""
production_plan_status = [
	"Draft",
	# "In Process",
	"Submitted",
	"Completed",
	# "Material Requested",
	# "Cancelled",
	# "Closed"
]
work_order_status = [
	# "Draft",
	# "Stopped",
	"Not Started",
	"In Process",
	# "Completed",
	# "Cancelled"
]
job_cards_status = [
	"Work In Progress",
	"Completed",
	# "Cancelled",
	# 'Material Transferred',
	# "Open"
]



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
		}
	]
	for s in production_plan_status :
		columns.append({
			"fieldname" : f"production_plan_{s}",
			"label" : _("PP") + " " + _(s),
			"fieldtype":"Float",
			"width" : 200
		})
	# [columns.append({
	# 		"fieldname" : f"production_plan_total",
	# 		"label" : _("Production Plan") + " " + _("Total"),
	# 		"fieldtype":"Float",
	# 		"width" : 250
	# 	})]
	for s in work_order_status :
		columns.append({
			"fieldname" : f"work_order_qty_{s}",
			"label" : _("Work Order") + " " + _(s),
			"fieldtype":"Float",
			"width" : 250
		})
	columns.append({
		"fieldname" : f"work_order_p_qty_Completed",
		"label" : _("Work Order") + " " + _('Completed'),
		"fieldtype":"Float",
		"width" : 200
	})
	# columns.append({
	# 		"fieldname" : f"work_order_qty_total",
	# 		"label" : _("Work Order")+" "+ _("Qty") + " " + _("Total"),
	# 		"fieldtype":"Float",
	# 		"width" : 250
	# 	})
	# columns.append({
	# 		"fieldname" : f"work_order_p_qty_total",
	# 		"label" : _("Work Order") +" "+ _("Produced Qty") + " " + _("Total"),
	# 		"fieldtype":"Float",
	# 		"width" : 250
	# 	})
	for s in job_cards_status :
		columns.append({
			"fieldname" : f"job_card_{s}",
			"label" : _("Job Card") + " " + _(s),
			"fieldtype":"Float",
			"width" : 200
		})
	# columns.append({
	# 		"fieldname" : f"stock_entry_Draft",
	# 		"label" : _("Stock Entry") + " " + _("Draft"),
	# 		"fieldtype":"Float",
	# 		"width" : 250
	# 	})
	columns.append({
			"fieldname" : f"stock_entry_Submitted",
			"label" : _("Stock Entry") + " " + _("Submitted"),
			"fieldtype":"Float",
			"width" : 250
		})
	return columns

def get_data(filters):
	result = []
	conditions = "where  p_plan.docstatus=1  "
	conditions2 = "where  p_plan_child.docstatus=1  "
	data = filters.get("item_ref")
	if data :
		conditions += f" and item.item_ref = '{data}'" 
		conditions2 += f" and item_child.item_ref = '{data}'" 
	data = filters.get("from_date")
	if data :
		conditions += f" and date(p_item.planned_start_date) >= date('{data}')" 
		conditions2 += f" and date(p_item_child.planned_start_date) >= date('{data}')" 
	data = filters.get("to_date")
	if data :
		conditions += f" and date(p_item.planned_start_date) <= date('{data}')" 
		conditions2 += f" and date(p_item_child.planned_start_date) <= date('{data}')" 





	pp_columns = ""
	for s in production_plan_status :
		pp_columns += f"""
				SUM(
					case when p_plan.status in ('{s}') then p_item.planned_qty else 0 end
					) as "production_plan_{s}" ,
		"""
	pp_columns += f"""
				SUM(
					case when p_plan.status not in  ('Draft' , 'Cancelled') then p_item.planned_qty else 0 end
					) as "production_plan_total" ,
		"""

	# wo_columns = ""
	# for s in work_order_status :
	#     wo_columns += f"""
	# 			SUM(
	#     case when w_order.status in ('{s}') then w_order.produced_qty else 0 end
	#     ) as "work_order_{s}" ,
	#     """
	# wo_columns += f"""
	# 			SUM(
	# 				case when w_order.status not in ('Draft' , 'Cancelled') then w_order.produced_qty else 0 end
	# 				) as "work_order_total" ,
	#     """
	wo_columns = ""
	for s in work_order_status :
		wo_columns += f"""
				ifnull((
					SELECT SUM(  w_order.qty  ) from `tabProduction Plan Item` p_item_child
						inner join `tabItem` item_child on p_item_child.item_code = item_child.item_code
						inner join `tabWork Order` w_order on w_order.production_plan_item = p_item_child.name
						inner join `tabProduction Plan` p_plan_child on p_plan_child.name = p_item_child.parent
							{conditions2}
						and item_child.item_ref = item.item_ref and w_order.status = '{s}'
			),0)  as 'work_order_qty_{s}' ,
		"""
	wo_columns += f"""
			ifnull((
				SELECT SUM(  w_order.produced_qty  ) from `tabProduction Plan Item` p_item_child
					inner join `tabItem` item_child on p_item_child.item_code = item_child.item_code
					inner join `tabWork Order` w_order on w_order.production_plan_item = p_item_child.name
					inner join `tabProduction Plan` p_plan_child on p_plan_child.name = p_item_child.parent
						{conditions2}
					and item_child.item_ref = item.item_ref and w_order.status = 'Completed'
		),0)  as 'work_order_p_qty_Completed' ,
	"""
	# wo_columns += f"""
	# 			ifnull((
	# 				SELECT SUM(  w_order.qty  ) from `tabProduction Plan Item` p_item_child
	# 					inner join `tabItem` item_child on p_item_child.item_code = item_child.item_code
	# 					inner join `tabWork Order` w_order on w_order.production_plan_item = p_item_child.name
	# 					inner join `tabProduction Plan` p_plan_child on p_plan_child.name = p_item_child.parent
	# 						{conditions2}
	# 					and item_child.item_ref = item.item_ref and w_order.status not in ('Draft' , 'Cancelled') 
	#        ),0)  as 'work_order_qty_total' ,
	#     """
	# wo_columns += f"""
	# 			ifnull((
	# 				SELECT SUM(  w_order.qty  ) from `tabProduction Plan Item` p_item_child
	# 					inner join `tabItem` item_child on p_item_child.item_code = item_child.item_code
	# 					inner join `tabWork Order` w_order on w_order.production_plan_item = p_item_child.name
	# 					inner join `tabProduction Plan` p_plan_child on p_plan_child.name = p_item_child.parent
	# 						{conditions2}
	# 					and item_child.item_ref = item.item_ref and w_order.status not in ('Draft' , 'Cancelled') 
	#        ),0)  as 'work_order_p_qty_total' ,
	#     """
	# jc_columns = ""
	# for s in job_cards_status :
	#     jc_columns += f"""
	# 			SUM(
	#     case when j_card.status in ('{s}') then j_card.total_completed_qty else 0 end
	#     ) as "job_card_{s}" ,
	#     """

	# jc_columns += f"""
	# 			 SUM(
	#     case when j_card.status not in ('Draft' , 'Cancelled') then j_card.total_completed_qty else 0 end
	#     ) as "job_card_total" ,
	#     """


	jc_columns = ""
	for s in job_cards_status :
		jc_columns += f"""
				ifnull((
				
		SELECT SUM(  j_card.total_completed_qty  ) from `tabProduction Plan Item` p_item_child
						inner join `tabItem` item_child on p_item_child.item_code = item_child.item_code
						inner join `tabWork Order` w_order on w_order.production_plan_item = p_item_child.name
						inner join `tabProduction Plan` p_plan_child on p_plan_child.name = p_item_child.parent
						inner join `tabJob Card` j_card on j_card.work_order = w_order.name
							{conditions2}
						and item_child.item_ref = item.item_ref and j_card.status = '{s}'
			
			),0) as "job_card_{s}" ,
		"""

	jc_columns += f"""
				ifnull((
					SELECT SUM(  j_card.total_completed_qty  ) from `tabProduction Plan Item` p_item_child
						inner join `tabItem` item_child on p_item_child.item_code = item_child.item_code
						inner join `tabWork Order` w_order on w_order.production_plan_item = p_item_child.name
						inner join `tabProduction Plan` p_plan_child on p_plan_child.name = p_item_child.parent
						inner join `tabJob Card` j_card on j_card.work_order = w_order.name
							{conditions2}
						and item_child.item_ref = item.item_ref and j_card.status  not in ('Draft' , 'Cancelled')
			
			),0) as "job_card_total" ,
		"""

	se_columns = ""
	# se_columns = f"""
	# 		ifnull((SELECT SUM(  se.fg_completed_qty  ) from `tabProduction Plan Item` p_item_child
	# 		inner join `tabItem` item_child on p_item_child.item_code = item_child.item_code
   	# 		inner join `tabProduction Plan` p_plan_child on p_plan_child.name = p_item_child.parent
	# 		inner join `tabWork Order` w_order on w_order.production_plan_item = p_item_child.name
	# 		inner join `tabStock Entry` se on w_order.name = se.work_order
	# 		{conditions2}		
    #  		and item_child.item_ref = item.item_ref and se.stock_entry_type = 'Manufacture' and se.docstatus = 1
	# 		),0) as "stock_entry_Draft" ,
	# """
	se_columns += f"""
			ifnull((SELECT SUM(  se.fg_completed_qty  ) from `tabProduction Plan Item` p_item_child
			inner join `tabItem` item_child on p_item_child.item_code = item_child.item_code
   			inner join `tabProduction Plan` p_plan_child on p_plan_child.name = p_item_child.parent
			inner join `tabWork Order` w_order on w_order.production_plan_item = p_item_child.name
			inner join `tabStock Entry` se on w_order.name = se.work_order
				{conditions2}	
     			and item_child.item_ref = item.item_ref and se.stock_entry_type = 'Manufacture' and se.docstatus = 0
			),0) as "stock_entry_Submitted" ,
	"""

	sql = f""" SELECT
		{pp_columns}
		{wo_columns}
		{jc_columns}
  		{se_columns}
		item.item_ref,
		(select item_ref_name from `tabItem Ref Names` where item_ref = item.item_ref) as item_ref_name
		from `tabProduction Plan Item` p_item
		inner join `tabProduction Plan` p_plan on p_plan.name = p_item.parent
		inner join `tabItem` item on p_item.item_code = item.item_code
		/*left join `tabWork Order` w_order on w_order.production_plan_item = p_item.name*/
		/* left join `tabJob Card` j_card on j_card.work_order = w_order.name*/
		/*left join `tabItem Ref Names` item_ref_names on item.item_ref = item_ref_names.item_ref*/
		{conditions}
		and ifnull(item.item_ref,'') <> ''
		group by item.item_ref

	"""

	# frappe.msgprint(sql)
	result=frappe.db.sql(sql,as_dict=1)

	return result
