# -*- coding: utf-8 -*-
# Copyright (c) 2021, Peter Maged and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
from datetime import datetime
import frappe
from frappe import _
from frappe.model.document import Document
import json
from frappe.utils.csvutils import getlink

class AwesomeStockEntry(Document):
	pass

@frappe.whitelist()
def get_available_dates (item_ref) :
    return frappe.db.sql_list(f"""
   select DISTINCT date(entry.posting_date) from `tabStock Entry` entry
    inner join `tabStock Entry Detail` child on child.parent = entry.name
    inner join tabItem item on child.item_code = item.name
    where entry.stock_entry_type = 'Manufacture' and entry.docstatus = 0
		and item.item_ref = '{item_ref}' and item.has_variants <> 1 and ifnull (item.variant_of,'')<>''
      and child.is_finished_item = 1 and ifnull(child.t_warehouse,'') <> '' ;
                       """)

@frappe.whitelist()
def get_stock_entries_by_ref(item_ref=None,stock_entry_date=None):
        if not item_ref :
            frappe.throw(_("Please Set Item Ref"))
        if not stock_entry_date :
            frappe.throw(_("Please Set Stock Entry Date"))
        xname = frappe.db.sql("""
                    select  attribute.name from  `tabItem Attribute` attribute
                    where attribute.axis = 'X' """) 
        xname = None if not xname else xname[0][0]
        yname = frappe.db.sql("""
                    select  attribute.name from  `tabItem Attribute` attribute
                    where attribute.axis = 'Y' """) or []
        yname = None if not yname else yname[0][0]

        if not xname:
            frappe.throw (_("Please Set axis X in Item Attribute"))
        if not yname:
            frappe.throw (_("Please Set axis Y in Item Attribute"))
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

       
        result = []
        

        items = frappe.db.sql(f"""
                                select entry.name , child.item_code , child.qty , entry.docstatus  from `tabStock Entry` entry
								inner join `tabStock Entry Detail` child on child.parent = entry.name
								inner join tabItem item on child.item_code = item.name
								where entry.stock_entry_type = 'Manufacture' and entry.docstatus = 0
									and item.item_ref = '{item_ref}' and item.has_variants <> 1 and ifnull (item.variant_of,'')<>''
								and child.is_finished_item = 1 and ifnull(child.t_warehouse,'') <> ''
								and date(entry.posting_date) = date('{stock_entry_date}')
        ;
                                """,as_dict = 1) or []
        
        for i in items :
            item = frappe._dict()
            item.item_code = i.item_code
            item.qty =  i.qty
            item.checked = False
            item.status =  "Draft"          
            item.stock_entry = i.name
            item.link = getlink2('Stock Entry',i.name)
            itemdoc = frappe.get_doc("Item",i.item_code)
            item.finish_qty = i.qty or 0
            attributes_names = [x.attribute for x in itemdoc.attributes]
            if  set([xname, yname]).issubset(attributes_names):
                item.x = [x.attribute_value for x in itemdoc.attributes if x.attribute == xname ][0].replace(' ','_')
                item.y = [x.attribute_value for x in itemdoc.attributes if x.attribute == yname ][0].replace(' ','_')
                # stock_entry_doc = frappe.get_doc('Stock Entry',i.name)
                # item.has_finish = finish_validation(stock_entry_doc)
                # item.has_start = start_validation(stock_entry_doc)
                # item.produced_qty = stock_entry_doc.produced_qty

                result.append(item)
        return {
            'x':x,
            'y':y,
            'xname':xname ,
            "yname":yname ,
            "result":result
        }

def getlink2(doctype, name):
    	return '/app/Form/{doctype}/{name}'.format(doctype=doctype,name=name)
 

@frappe.whitelist()
def submit_all(selected):
	selected = json.loads(selected) or []
	if len(selected) == 0 :
		frappe.throw(_('Please Select at least Stock Entry'))
	for cell in selected:
		cell = frappe._dict(cell)
		if cell.stock_entry :
			doc = frappe.get_doc('Stock Entry',cell.stock_entry)
			try:
				if doc.docstatus == 0 :
					# doc.validate()
					doc.submit()
					frappe.msgprint(_("""{} is submitted""".format(doc.name)),indicator='green')
				else:
					frappe.msgprint(_("""{} isn't Draft""".format(doc.name)),indicator='yellow')
			except Exception as e :
				frappe.msgprint(_("""Error While Submit Stock Entry '{}'
								'{}'""").format(doc.name,str(e)),indicator='red')


@frappe.whitelist()
def edit_all(selected):
    selected = json.loads(selected) or []
    if len(selected) == 0 :
        frappe.throw(_('Please Select at least Stock Entry'))
    for cell in selected:
        cell = frappe._dict(cell)
        if cell.stock_entry :
            doc = frappe.get_doc('Stock Entry',cell.stock_entry)
            try:
                if doc.docstatus == 0 :
                    items = doc.items
                    for i in items :
                        if i.item_code == cell.item_code :
                            i.qty = cell.finish_qty
                    doc.fg_completed_qty = cell.finish_qty or 0
                    doc.update({
						"items":items,
                        "fg_completed_qty":cell.finish_qty or 0
					}) 
                    doc.save()
                    frappe.msgprint(_("""{} is updated""".format(doc.name)),indicator='green')
                else:
                    frappe.msgprint(_("""{} isn't Draft""".format(doc.name)),indicator='yellow')
            except Exception as e :
                frappe.msgprint(_("""Error While Submit Stock Entry '{}'
                                        '{}'""").format(doc.name,str(e)),indicator='red')


