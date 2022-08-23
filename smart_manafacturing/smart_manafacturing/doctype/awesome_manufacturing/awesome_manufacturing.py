# -*- coding: utf-8 -*-
# Copyright (c) 2021, Peter Maged and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
from datetime import datetime
import frappe
from frappe import _
from frappe.model.document import Document
import json
from erpnext.manufacturing.doctype.work_order.work_order import make_stock_entry
from frappe.utils.csvutils import getlink

class AwesomeManufacturing(Document):
	pass


@frappe.whitelist()
def get_available_dates (item_ref) :
    return frappe.db.sql_list(f"""
    select DISTINCT date(parent.planned_start_date) from  `tabWork Order` parent
    where parent.production_item in (select name from tabItem where item_ref = '{item_ref}' 
    and has_variants <> 1 and ifnull (variant_of,'')<>'')
    and parent.docstatus < 2 and parent.status not in ('Cancelled' , 'Completed') 
                       """)

@frappe.whitelist()
def get_work_orders_by_ref(item_ref=None,work_order_date=None,batch_no=None):
        if not item_ref :
            frappe.throw(_("Please Set Item Ref"))
        if not work_order_date and not batch_no :
            frappe.throw(_("Please Set Work Order Date or Batch No"))
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
        

        items = frappe.db.sql("""
                                select parent.name , parent.production_item as item_code , parent.qty ,parent.material_transferred_for_manufacturing,parent.produced_qty , parent.status from  `tabWork Order` parent 
                                    where parent.production_item in (select name from tabItem where item_ref = '{}' and has_variants <> 1 and ifnull (variant_of,'')<>'') 
                                    and  (batch_no='{}' or date(parent.planned_start_date) = date('{}') )
                                    and parent.docstatus < 2 and parent.status not in ('Cancelled')
                                    ;
                                """.format(item_ref, batch_no or '',work_order_date or datetime.today()),as_dict = 1) or []
        """flt(frm.doc.material_transferred_for_manufacturing) - flt(frm.doc.produced_qty)"""
        for i in items :
            item = frappe._dict()
            item.item_code = i.item_code
            item.qty =  i.qty
            item.checked = False
            item.status =  i.status            
            item.work_order = i.name
            item.link = getlink2('Work Order',i.name)
            itemdoc = frappe.get_doc("Item",i.item_code)
            item.finish_qty = (i.material_transferred_for_manufacturing or 0) - (i.produced_qty or 0)
            item.start_qty = (i.qty or 0) - (i.material_transferred_for_manufacturing or 0) 
            attributes_names = [x.attribute for x in itemdoc.attributes]
            if  set([xname, yname]).issubset(attributes_names):
                item.x = [x.attribute_value for x in itemdoc.attributes if x.attribute == xname ][0].replace(' ','_')
                item.y = [x.attribute_value for x in itemdoc.attributes if x.attribute == yname ][0].replace(' ','_')
                work_order_doc = frappe.get_doc('Work Order',i.name)
                item.has_finish = finish_validation(work_order_doc)
                item.has_start = start_validation(work_order_doc)
                item.produced_qty = work_order_doc.produced_qty

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
        frappe.throw(_('Please Select at least Work Order'))
    default_wip_warehouse = frappe.db.get_single_value("Manufacturing Settings", "default_wip_warehouse")
    if not default_wip_warehouse :
        frappe.throw(_('Please Set Default WIP Warhouse in Manufacturing Settings'))
    for cell in selected:
        cell = frappe._dict(cell)
        if cell.work_order :
            doc = frappe.get_doc('Work Order',cell.work_order)
            try:
                if doc.docstatus == 0 :
                    if not doc.wip_warehouse :
                        doc.wip_warehouse = default_wip_warehouse
                        doc.save()
                    doc.submit()
                    frappe.msgprint(_("""{} is submitted""".format(doc.name)),indicator='green')
                else:
                    frappe.msgprint(_("""{} isn't Draft""".format(doc.name)),indicator='yellow')
            except Exception as e :
                frappe.msgprint(_("""Error While Submit Work Order '{}'
                                        '{}'""").format(doc.name,str(e)),indicator='red')

@frappe.whitelist()
def start_all(selected):
    selected = json.loads(selected) or []
    if len(selected) == 0 :
        frappe.throw(_('Please Select at least Work Order'))
    for cell in selected:
        cell = frappe._dict(cell)
        if cell.work_order :
            doc = frappe.get_doc('Work Order',cell.work_order)
            try:
                if doc.docstatus == 1 and start_validation(doc):
                    qty=cell.start_qty or None
                    if not qty:
                        frappe.throw("Start Qty Can't be 0 or Empty")
                    se_dic = make_stock_entry(doc.name, 'Material Transfer for Manufacture',qty=qty)
                    se = frappe.get_doc(se_dic)
                    se.save()
                    lnk = getlink("Stock Entry",se.name)
                    #se.submit()
                    frappe.msgprint(_("""{} is started""".format(doc.name)),indicator='green')
                    frappe.msgprint(_("""Stock Entry {} was Created""").format(lnk),indicator='green')
                else:
                    frappe.msgprint(_("""{} isn't has start Progress""".format(doc.name)),indicator='yellow')
            except Exception as e :
                frappe.msgprint(_("""Error While Start Work Order '{}'
                                        '{}'""").format(doc.name,str(e)),indicator='red')
def start_validation(doc):
    is_valid = 0 if (doc.skip_transfer or doc.transfer_material_against == 'Job Card') else 1
    if (is_valid and doc.docstatus ==1 ):
        if ((float(doc.material_transferred_for_manufacturing) < float(doc.qty)) and doc.status != 'Stopped') :
            return True
    return False

@frappe.whitelist()
def update_batch_no(selected,batch_no=''):
    selected = json.loads(selected) or []
    if len(selected) == 0 :
        frappe.throw(_('Please Select at least Work Order'))
    for cell in selected:
        cell = frappe._dict(cell)
        if cell.work_order :
            doc = frappe.get_doc('Work Order',cell.work_order)
            try:
                doc.batch_no = batch_no
                doc.save()
                frappe.msgprint(_("""{} is updated""".format(doc.name)),indicator='green')
            except Exception as e :
                frappe.msgprint(_("""Error While Update Work Order '{}'
                                       '{}'""").format(doc.name,str(e)),indicator='red')
@frappe.whitelist()
def finish_all(selected):
    selected = json.loads(selected) or []
    if len(selected) == 0 :
        frappe.throw(_('Please Select at least Work Order'))
        
    for cell in selected:
        cell = frappe._dict(cell)
        if cell.work_order :
            doc = frappe.get_doc('Work Order',cell.work_order)
            try:
                if doc.docstatus == 1 and finish_validation(doc):
                    #doc.submit()
                    qty=cell.finish_qty or None
                    if not qty:
                        frappe.throw("Finished Qty Can't be 0 or Empty")
                    se_dic = make_stock_entry(doc.name, 'Manufacture' ,qty=qty)
                    se = frappe.get_doc(se_dic)
                    se.save()
                    lnk = getlink("Stock Entry",se.name)

                    frappe.msgprint(_("""Stock Entry {} was Created""").format(lnk),indicator='green')

                    #se.submit()
                    frappe.msgprint(_("""{} is Finished""".format(doc.name)),indicator='green')
                else:
                    frappe.msgprint(_("""{} isn't has Finish Progress""".format(doc.name)),indicator='yellow')
            except Exception as e :
                frappe.msgprint(_("""Error While Finish Work Order '{}'
                                       '{}'""").format(doc.name,str(e)),indicator='red')

def finish_validation(doc):
    """
    ((flt(doc.produced_qty) < flt(doc.material_transferred_for_manufacturing))
					&& frm.doc.status != 'Stopped')
    """
    is_valid = 0 if (doc.skip_transfer) else 1
    if (is_valid and doc.docstatus ==1 ):
        if ((float(doc.material_transferred_for_manufacturing) > float(doc.produced_qty)) and doc.status != 'Stopped') :
            return True
    return False

