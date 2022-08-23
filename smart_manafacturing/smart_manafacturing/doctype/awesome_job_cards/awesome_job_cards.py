# -*- coding: utf-8 -*-
# Copyright (c) 2021, Peter Maged and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
from codecs import ignore_errors
import frappe
from frappe import _
from frappe.model.document import Document
import json
#from erpnext.manufacturing.doctype.work_order.work_order import make_stock_entry
from erpnext.manufacturing.doctype.job_card.job_card import make_stock_entry
from frappe.utils.csvutils import getlink
# import frappe
from frappe.model.document import Document
from frappe.utils import (flt)
class AwesomeJobCards(Document):
	pass


@frappe.whitelist()
def get_available_dates (item_ref , operation) :
    return frappe.db.sql_list(f"""
    select DISTINCT  date(parent.posting_date) 
    from `tabJob Card` parent  where parent.production_item in (select name from tabItem 
    where item_ref = '{item_ref}' and has_variants <> 1 and ifnull (variant_of,'')<>'')
    and operation = '{operation}'
    and parent.docstatus < 2 and parent.status not in  ('Cancelled' , 'Completed')  ;
                       """)
@frappe.whitelist()
def get_job_cards_by_ref(item_ref=None,job_card_date=None , operation=None):
        if not item_ref :
            frappe.throw(_("Please Set Item Ref"))
        if not job_card_date :
            frappe.throw(_("Please Set Job Card Date"))
        if not operation :
            frappe.throw(_("Please Set Operation"))
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
        
        sql = """
                                select parent.name , parent.production_item as item_code 
                                , parent.employee , parent.for_quantity ,parent.transferred_qty,
                                parent.total_completed_qty , parent.status
                                from `tabJob Card` parent  where parent.production_item in (select name from tabItem where item_ref = '{}' and has_variants <> 1 and ifnull (variant_of,'')<>'')
                                    and date(parent.posting_date) = date('{}')
                                    and operation = '{}'
                                    and parent.docstatus < 2 and parent.status not in ('Cancelled')
                                    ;
                                """.format(item_ref,job_card_date,operation)
        items = frappe.db.sql(sql,as_dict = 1) or []
        #frappe.msgprint(sql)
        """flt(frm.doc.material_transferred_for_manufacturing) - flt(frm.doc.produced_qty)"""
        for i in items :
            item = frappe._dict()
            item.item_code = i.item_code
            item.for_quantity =  i.for_quantity
            item.total_completed_qty = i.total_completed_qty 
            item.checked = False
            item.status =  i.status            
            item.job_card = i.name
            item.employee=i.employee
            if (i.employee):
                item.employee_name = frappe.db.get_value('Employee',i.employee,"employee_name")
            itemdoc = frappe.get_doc("Item",i.item_code)
            item.start_qty = (i.for_quantity or 0) - (i.total_completed_qty or 0)
            
            if item.start_qty < 0 :
                item.start_qty = 0
            #item.start_qty = (i.for_quantity or 0) - (i.material_transferred_for_manufacturing or 0) 
            attributes_names = [x.attribute for x in itemdoc.attributes]
            if  set([xname, yname]).issubset(attributes_names):
                item.x = [x.attribute_value for x in itemdoc.attributes if x.attribute == xname ][0].replace(' ','_')
                item.y = [x.attribute_value for x in itemdoc.attributes if x.attribute == yname ][0].replace(' ','_')
                job_card_doc = frappe.get_doc('Job Card',i.name)
                if job_card_doc.status == "Open":
                    item.start_qty = get_last_job_card_completed_qty (job_card_doc,item.start_qty )
                else:
                   item.start_qty=item.for_quantity
                #item.has_finish = finish_validation(job_card_doc)
                item.has_start = start_validation(job_card_doc)
                result.append(item)
        
        return {
            'x':x,
            'y':y,
            'xname':xname ,
            "yname":yname ,
            "result":result
        }


@frappe.whitelist()
def submit_all(selected):
    selected = json.loads(selected) or []
    if len(selected) == 0 :
        frappe.throw(_('Please Select at least Job Card'))
    for cell in selected:
        cell = frappe._dict(cell)
        if cell.job_card :
            doc = frappe.get_doc('Job Card',cell.job_card)
            try:
                if doc.docstatus == 0 :
                    #doc.validate()
                    doc.validate_job_card()
                    doc.submit()
                    frappe.msgprint(_("""{} is submitted""".format(doc.name)),indicator='green')
                else:
                    frappe.msgprint(_("""{} isn't Draft""".format(doc.name)),indicator='yellow')
            except Exception as e :
                frappe.msgprint(_("""Error While Submit Job Card '{}'
                                        '{}'""").format(doc.name,str(e)),indicator='red')

@frappe.whitelist()
def start_all(selected,employee , from_time,to_time):
    selected = json.loads(selected) or []
    if len(selected) == 0 :
        frappe.throw(_('Please Select at least Job Card'))
    if not employee:
        frappe.throw(_("Please Set Employee"))
    if not from_time:
        frappe.throw(_("Please Set From Time"))
    if not to_time:
        frappe.throw(_("Please Set To Time"))
    
    for cell in selected:
        cell = frappe._dict(cell)
        if cell.job_card :
            doc = frappe.get_doc('Job Card',cell.job_card)
            qty = float(cell.start_qty) or 0
            try:
                
                allowed_qty = get_last_job_card_completed_qty(doc,qty)
                #if allowed_qty < qty:
                   # frappe.throw(_("Can't accept qty more than {} ").format(allowed_qty))
            # if 1:
                if doc.docstatus == 0:
                    allowed_qty=qty
                    row = doc.append('time_logs')
                    row.from_time = from_time
                    row.to_time = to_time
                    row.completed_qty = qty
                    row.employee = employee
                    doc.employee = employee
                    doc.save()
                    doc.set('items', [])
                    update_job_card(doc)
                    get_required_items(doc)
                    doc.save()
                    frappe.msgprint(_("""{} is started""".format(doc.name)),indicator='green')
                else:
                    frappe.msgprint(_("""{} isn't has start Progress""".format(doc.name)),indicator='yellow')
            except Exception as e :
               frappe.msgprint(_("""Error While Start Job Card '{}'
                                       '{}'""").format(doc.name,str(e)),indicator='red')











def get_last_job_card_completed_qty(doc , qty) :
    work_order = frappe.get_doc("Work Order" , doc.work_order)
    if len(getattr(work_order,'operations',[])) > 0 :
        
        operations = sorted(work_order.operations , key = lambda i: i.sequence_id)
        # frappe.msgprint(str(operations))
        last_operation = operations [0]
        if last_operation.operation != doc.operation :
            for i in operations :
                if i.operation == doc.operation :
                        break
                last_operation = i
                
        if last_operation.operation != doc.operation :
                # get Last Completed Qty
                # First Get Job Card
                job_Card = frappe.db.get_value("Job Card",{"work_order":work_order.name , "operation":last_operation.operation} , ['total_completed_qty'] , as_dict=1)
                # frappe.msgprint(job_Card.name)
                qty = job_Card.total_completed_qty
                

            

    return qty


def material_transfer_validation(doc):
    is_valid =(doc.items and len(doc.items) > 0)
    if (is_valid):
        """frm.doc.for_quantity != frm.doc.transferred_qty"""
        if ((float(doc.for_quantity) != float(doc.transferred_qty))) :
            return True
    return False

def start_validation(doc):
    if (doc.docstatus ==0):
            return True
    return False
@frappe.whitelist()
def material_transfer_all(selected):
    selected = json.loads(selected) or []
    if len(selected) == 0 :
        frappe.throw(_('Please Select at least Job Card'))
    for cell in selected:
        cell = frappe._dict(cell)
        if cell.job_card :
            doc = frappe.get_doc('Job Card',cell.job_card)
            try:
                if material_transfer_validation(doc):
                    #doc.submit()
                    
                    se = make_stock_entry(doc.name)
                    #se = frappe.get_doc(se_dic)
                    se.save()
                    lnk = getlink("Stock Entry",se.name)

                    frappe.msgprint(_("""Stock Entry {} was Created""").format(lnk),indicator='green')

                    #se.submit()
                    frappe.msgprint(_("""{} is Finished""".format(doc.name)),indicator='green')
                else:
                    frappe.msgprint(_("""{} isn't has Finish Progress""".format(doc.name)),indicator='yellow')
            except Exception as e :
                    frappe.msgprint(_("""Error While Finish Job Cards '{}'
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



@frappe.whitelist()
def get_required_items(self):
		if not self.get('work_order'):
			return

		doc = frappe.get_doc('Work Order', self.get('work_order'))
		if doc.transfer_material_against == 'Work Order' or doc.skip_transfer:
			return
            
		for d in doc.required_items:
			if not d.operation:
				frappe.throw(_("Row {0} : Operation is required against the raw material item {1}")
					.format(d.idx, d.item_code))
               
			if self.get('operation') == d.operation:
                
				self.append('items', {
					'item_code': d.item_code,
					'source_warehouse': d.source_warehouse,
					'uom': frappe.db.get_value("Item", d.item_code, 'stock_uom'),
					'item_name': d.item_name,
					'description': d.description,
					'required_qty': (d.required_qty * flt(self.for_quantity)) / doc.qty
				})

def update_job_card(self,fun=''):
    self.for_quantity = self.total_completed_qty