# Copyright (c) 2013, Peter Maged and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _

def execute(filters=None):
	columns, data = [], []
	x_y = get_x_y(item_ref=filters.get('item_ref'))
	if len(x_y.get('x')) == 0 :
		return columns, data
	columns = get_columns(x_y)
	data = get_data(filters , x_y)
	return columns, data


@frappe.whitelist()
def get_x_y(item_ref=''):
        x = frappe.db.sql_list("""
                    select Distinct replace(child.attribute_value , ' ' , '_') from `tabItem Variant Attribute` child
                    inner join `tabItem Attribute` attribute on attribute.name = child.attribute
                    inner join `tabItem Attribute Value` itemvalue on itemvalue.attribute_value = child.attribute_value
                    inner join `tabItem` item on item.name = child.parent
                    where attribute.axis = 'X' and item.item_ref = '{}' and item.variant_of is not null
                    order by itemvalue.idx asc """.format(item_ref)) or []
        y = frappe.db.sql_list("""
                    select Distinct replace(child.attribute_value , ' ' , '_') from `tabItem Variant Attribute` child
                    inner join `tabItem Attribute` attribute on attribute.name = child.attribute
                    inner join `tabItem Attribute Value` itemvalue on itemvalue.attribute_value = child.attribute_value
                    inner join `tabItem` item on item.name = child.parent
                    where attribute.axis = 'Y' and item.item_ref = '{}' and item.variant_of is not null
                    order by itemvalue.idx asc """.format(item_ref)) or []

        xname = frappe.db.sql_list("""
                    select  attribute.name from  `tabItem Attribute` attribute
                    where attribute.axis = 'X' """) or []
        yname = frappe.db.sql_list("""
                    select  attribute.name from  `tabItem Attribute` attribute
                    where attribute.axis = 'Y' """) or []

        return {
            'x':x,
            'y':y,
            'xname':xname ,
            "yname":yname
        }

def get_columns (x_y):
    columns = [
		{
			'fieldname': "customer",
			'label': "Customer",
			'fieldtype': "Link",
			'options': "Customer",
    	},
  		{
			'fieldname': "customer_name",
			'label': "Customer Name",
			'fieldtype': "Data",
			#'options': "Item",
    	},
	]
    return columns


def get_data(filters , x_y):
    pass