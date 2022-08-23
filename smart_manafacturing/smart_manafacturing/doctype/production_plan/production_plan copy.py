from __future__ import unicode_literals
from erpnext.stock.doctype.item.item import get_item_defaults
import frappe
import json
import frappe.utils
from frappe.utils import cstr, flt, getdate, cint, nowdate, add_days, get_link_to_form, strip_html
from frappe import _
from erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry
from erpnext.stock.get_item_details import get_item_details
from frappe.utils.csvutils import getlink
import json
from erpnext import get_default_company

from six import string_types, iteritems
import frappe, json, copy

from frappe.model.document import Document
from frappe.utils import cstr, flt, cint, nowdate, add_days, comma_and, now_datetime, ceil
from frappe.utils.csvutils import build_csv_response
from erpnext.manufacturing.doctype.bom.bom import validate_bom_no, get_children
from erpnext.manufacturing.doctype.work_order.work_order import get_item_details
from erpnext.setup.doctype.item_group.item_group import get_item_group_defaults


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


@frappe.whitelist()    
def get_items_by_ref (doc):
    doc = json.loads(str(doc))
    doc = frappe._dict(doc)
    doc.company = get_default_company()
    result = []
    items = frappe.db.sql_list("""
                               select name from tabItem where item_ref = '{}' and has_variants <> 1
                               """.format(doc.item_ref)) or []
    for i in items :
        #details = frappe._dict()
        #details.item_code = i
        if getattr(doc,'values' , None):
            itemdoc = frappe.get_doc("Item",i)
            args = {
                "item_code": itemdoc.item_code,
                "warehouse": None,
                "customer": doc.customer,
                "company":doc.company,
                "conversion_rate": 1.0,
                "selling_price_list": doc.selling_price_list,
                "price_list_currency":doc.price_list_currency,
                "plc_conversion_rate": 1.0,
                "doctype": "Sales Order",
                "name": "",
                "supplier": None,
                "transaction_date": None,
                "conversion_rate": 1.0,
                "buying_price_list": None,
                "ignore_pricing_rule": doc.ignore_pricing_rule,
                "project":doc.project,
                "set_warehouse": doc.set_warehouse
            }
            all_details = get_item_details(args,doc)
            fields = [x.fieldname for x in frappe.get_meta("Sales Order Item").fields]
            temp = frappe._dict()
            for field in fields :
                setattr(temp,field,getattr(all_details,field,None))
            details = temp
            details.delivery_date = doc.delivery_date
            details.item_ref = doc.item_ref
            details.rate = details.price_list_rate
            if (getattr(itemdoc,'variant_of' , None)):
                atrributenames = [i.attribute for i in itemdoc.attributes]
                if  set([doc.xname, doc.yname]).issubset(atrributenames):
                    details.x = [i.attribute_value for i in itemdoc.attributes if i.attribute == doc.xname ][0].replace(' ','_')
                    details.y = [i.attribute_value for i in itemdoc.attributes if i.attribute == doc.yname ][0].replace(' ','_')
                    """
                    details.qty = doc.values[details.x][details.y] or 0
                    details.amount = details.rate  * details.qty
                    details.base_amount = details.base_price_list_rate  * details.qty
                    details.net_amount = details.amount
                    details.net_rate = details.price_list_rate
                    details.base_net_rate = details.base_price_list_rate
                    details.base_net_amount = details.base_amount
                    """
                    
                    
            result.append(details)
            #frappe.msgprint(str(details))

    return result

@frappe.whitelist()
def get_items_data (doc):
    doc = json.loads(str(doc))
    doc = frappe._dict(doc)
    x = getattr(doc,'xname',None)
    y = getattr(doc,'yname',None)
    sales_order = getattr(doc,'cur_sales_order',None)
    item_ref = getattr(doc,'cur_item_ref',None)
    if x and y and sales_order and item_ref:
        #items = getattr(doc,'po_items',[])
        #if items :
            # frappe.msgprint(str(items))
            # items = json.loads(str(items))
            #items = [x for x in items if x['sales_order'] == sales_order]
            #if len(items) > 0:
        sql = """
        select item.name as item_code,item.item_ref,so_item.parent as sales_order, sum((so_item.qty - so_item.work_order_qty) * so_item.conversion_factor) as planned_qty, (select attribute_value from `tabItem Variant Attribute` where attribute = '{x}' and parent = item.name limit 1) as x,
    (select attribute_value from `tabItem Variant Attribute` where attribute = '{y}' and parent = item.name limit 1) as y
            from tabItem item
            inner join `tabSales Order Item` so_item on item.name = so_item.item_code
     where so_item.parent = '{sales_order}' and item.item_ref = '{item_ref}'
    group by item.name
        """.format(x=x,y=y , sales_order=sales_order  , item_ref = item_ref)
        # frappe.msgprint(sql)
        return frappe.db.sql(sql,as_dict=1)

@frappe.whitelist()
def get_item_ref_query(sales_order,item_ref=None):
    item_ref_cond = ""
    if item_ref :
        item_ref_cond = " and item_ref = '{}'".format(str(item_ref))
    sql = """
    select distinct item_ref from 
        (select distinct item.item_ref 
        from `tabSales Order Item` so_item
        inner join tabItem item on item.name = so_item.item_code
        where so_item.parent = '{0}' and ifnull(item.item_ref,'') <> ''
    union
    select item_ref from `tabSales Order`
    where name = '{0}' and ifnull(item_ref,'') <> '') t
    where 1=1 {1}
        """.format(sales_order , item_ref_cond)
    return frappe.db.sql_list(sql)




@frappe.whitelist()
def get_items_for_material_requests(doc, warehouses=None):
    if isinstance(doc, string_types):
        doc = frappe._dict(json.loads(doc))

    warehouse_list = []
    if warehouses:
        if isinstance(warehouses, string_types):
            warehouses = json.loads(warehouses)

        for row in warehouses:
            child_warehouses = frappe.db.get_descendants('Warehouse', row.get("warehouse"))
            if child_warehouses:
                warehouse_list.extend(child_warehouses)
            else:
                warehouse_list.append(row.get("warehouse"))

    if warehouse_list:
        warehouses = list(set(warehouse_list))

        if doc.get("for_warehouse") and doc.get("for_warehouse") in warehouses:
            warehouses.remove(doc.get("for_warehouse"))

        warehouse_list = None

    doc['mr_items'] = []

    po_items = doc.get('po_items') if doc.get('po_items') else doc.get('items')
    # Check for empty table or empty rows
    if not po_items or not [row.get('item_code') for row in po_items if row.get('item_code')]:
        frappe.throw(_("Items to Manufacture are required to pull the Raw Materials associated with it."),
            title=_("Items Required"))

    company = doc.get('company')
    ignore_existing_ordered_qty = doc.get('ignore_existing_ordered_qty')
    include_safety_stock = doc.get('include_safety_stock')

    so_item_details = frappe._dict()
    for data in po_items:
        planned_qty = data.get('required_qty') or data.get('planned_qty')
        ignore_existing_ordered_qty = data.get('ignore_existing_ordered_qty') or ignore_existing_ordered_qty
        # item_mas = frappe.get_doc("Item",data.get("item_code"))
        # item_defaults = get_item_defaults (data.get("item_code"),company)
        warehouse = doc.get('for_warehouse') 
        item_details = {}
        if data.get("bom") or data.get("bom_no"):
            if data.get('required_qty'):
                bom_no = data.get('bom')
                include_non_stock_items = 1
                include_subcontracted_items = 1 if data.get('include_exploded_items') else 0
            else:
                bom_no = data.get('bom_no')
                include_subcontracted_items = doc.get('include_subcontracted_items')
                include_non_stock_items = doc.get('include_non_stock_items')

            if not planned_qty:
                frappe.throw(_("For row {0}: Enter Planned Qty").format(data.get('idx')))

            if bom_no:
                if data.get('include_exploded_items') and include_subcontracted_items:
                    # fetch exploded items from BOM
                    item_details = get_exploded_items(item_details,
                        company, bom_no, include_non_stock_items, planned_qty=planned_qty)
                else:
                    item_details = get_subitems(doc, data, item_details, bom_no, company,
                        include_non_stock_items, include_subcontracted_items, 1, planned_qty=planned_qty)
        elif data.get('item_code'):
            item_master = frappe.get_doc('Item', data['item_code']).as_dict()
            purchase_uom = item_master.purchase_uom or item_master.stock_uom
            conversion_factor = 0
            for d in item_master.get("uoms"):
                if d.uom == purchase_uom:
                    conversion_factor = d.conversion_factor

            item_details[item_master.name] = frappe._dict(
                {
                    'item_name' : item_master.item_name,
                    'default_bom' : doc.bom,
                    'purchase_uom' : purchase_uom,
                    'default_warehouse': item_master.default_warehouse,
                    'min_order_qty' : item_master.min_order_qty,
                    'default_material_request_type' : item_master.default_material_request_type,
                    'qty': planned_qty or 1,
                    'is_sub_contracted' : item_master.is_subcontracted_item,
                    'item_code' : item_master.name,
                    'description' : item_master.description,
                    'stock_uom' : item_master.stock_uom,
                    'conversion_factor' : conversion_factor,
                    'safety_stock': item_master.safety_stock
                }
            )

        sales_order = doc.get("sales_order")

        for item_code, details in iteritems(item_details):
            so_item_details.setdefault(sales_order, frappe._dict())
            if item_code in so_item_details.get(sales_order, {}):
                so_item_details[sales_order][item_code]['qty'] = so_item_details[sales_order][item_code].get("qty", 0) + flt(details.qty)
            else:
                so_item_details[sales_order][item_code] = details

    mr_items = []
    for sales_order, item_code in iteritems(so_item_details):
        item_dict = so_item_details[sales_order]
        for details in item_dict.values():
            bin_dict = get_bin_details(details, doc.company, warehouse)
            bin_dict = bin_dict[0] if bin_dict else {}

            if details.qty > 0:
                items = get_material_request_items(details, sales_order, company,
                    ignore_existing_ordered_qty, include_safety_stock, warehouse, bin_dict)
                if items:
                    mr_items.append(items)

    if not ignore_existing_ordered_qty and warehouses:
        new_mr_items = []
        for item in mr_items:
            get_materials_from_other_locations(item, warehouses, new_mr_items, company)

        mr_items = new_mr_items

    if not mr_items:
        to_enable = frappe.bold(_("Ignore Existing Projected Quantity"))
        warehouse = frappe.bold(doc.get('for_warehouse'))
        message = _("As there are sufficient raw materials, Material Request is not required for Warehouse {0}.").format(warehouse) + "<br><br>"
        message += _("If you still want to proceed, please enable {0}.").format(to_enable)

        frappe.msgprint(message, title=_("Note"))

    return mr_items


def get_material_request_items(row, sales_order, company,
	ignore_existing_ordered_qty, include_safety_stock, warehouse, bin_dict):
	total_qty = row['qty']

	required_qty = 0
	if ignore_existing_ordered_qty or bin_dict.get("projected_qty", 0) < 0:
		required_qty = total_qty
	elif total_qty > bin_dict.get("projected_qty", 0):
		required_qty = total_qty - bin_dict.get("projected_qty", 0)
	if required_qty > 0 and required_qty < row['min_order_qty']:
		required_qty = row['min_order_qty']
	item_group_defaults = get_item_group_defaults(row.item_code, company)

	if not row['purchase_uom']:
		row['purchase_uom'] = row['stock_uom']

	if row['purchase_uom'] != row['stock_uom']:
		if not row['conversion_factor']:
			frappe.throw(_("UOM Conversion factor ({0} -> {1}) not found for item: {2}")
				.format(row['purchase_uom'], row['stock_uom'], row.item_code))
		required_qty = required_qty / row['conversion_factor']

	if frappe.db.get_value("UOM", row['purchase_uom'], "must_be_whole_number"):
		required_qty = ceil(required_qty)

	if include_safety_stock:
		required_qty += flt(row['safety_stock'])

	if required_qty > 0:
		return {
			'item_code': row.item_code,
			'item_name': row.item_name,
			'quantity': required_qty,
			'required_bom_qty': total_qty,
			'stock_uom': row.get("stock_uom"),
			'warehouse': warehouse or row.get('source_warehouse') \
				or row.get('default_warehouse') or item_group_defaults.get("default_warehouse"),
			'safety_stock': row.safety_stock,
			'actual_qty': bin_dict.get("actual_qty", 0),
			'projected_qty': bin_dict.get("projected_qty", 0),
			'ordered_qty': bin_dict.get("ordered_qty", 0),
			'reserved_qty_for_production': bin_dict.get("reserved_qty_for_production", 0),
			'min_order_qty': row['min_order_qty'],
			'material_request_type': row.get("default_material_request_type"),
			'sales_order': sales_order,
			'description': row.get("description"),
			'uom': row.get("purchase_uom") or row.get("stock_uom")
		}
@frappe.whitelist()
def get_bin_details(row, company, for_warehouse=None, all_warehouse=False):
	if isinstance(row, string_types):
		row = frappe._dict(json.loads(row))

	company = frappe.db.escape(company)
	conditions, warehouse = "", ""

	conditions = " and warehouse in (select name from `tabWarehouse` where company = {0})".format(company)
	if not all_warehouse:
		warehouse = for_warehouse or row.get('source_warehouse') or row.get('default_warehouse')

	if warehouse:
		lft, rgt = frappe.db.get_value("Warehouse", warehouse, ["lft", "rgt"])
		conditions = """ and warehouse in (select name from `tabWarehouse`
			where lft >= {0} and rgt <= {1} and name=`tabBin`.warehouse and company = {2})
		""".format(lft, rgt, company)

	return frappe.db.sql(""" select ifnull(sum(projected_qty),0) as projected_qty,
		ifnull(sum(actual_qty),0) as actual_qty, ifnull(sum(ordered_qty),0) as ordered_qty,
		ifnull(sum(reserved_qty_for_production),0) as reserved_qty_for_production, warehouse from `tabBin`
		where item_code = %(item_code)s {conditions}
		group by item_code, warehouse
	""".format(conditions=conditions), { "item_code": row['item_code'] }, as_dict=1)

def get_exploded_items(item_details, company, bom_no, include_non_stock_items, planned_qty=1):
        for d in frappe.db.sql("""select bei.item_code, item.default_bom as bom,
            ifnull(sum(bei.stock_qty/ifnull(bom.quantity, 1)), 0)*%s as qty, item.item_name,
            bei.description, bei.stock_uom, item.min_order_qty, bei.source_warehouse,
            item.default_material_request_type, item.min_order_qty, item_default.default_warehouse,
            item.purchase_uom, item_uom.conversion_factor
        from
            `tabBOM Explosion Item` bei
            JOIN `tabBOM` bom ON bom.name = bei.parent
            JOIN `tabItem` item ON item.name = bei.item_code
            LEFT JOIN `tabItem Default` item_default
                ON item_default.parent = item.name and item_default.company=%s
            LEFT JOIN `tabUOM Conversion Detail` item_uom
                ON item.name = item_uom.parent and item_uom.uom = item.purchase_uom
        where
            bei.docstatus < 2
            and bom.name=%s and item.is_stock_item in (1, {0})
        group by bei.item_code, bei.stock_uom""".format(0 if include_non_stock_items else 1),
        (planned_qty, company, bom_no), as_dict=1):
            item_details.setdefault(d.get('item_code'), d)
        return item_details


def get_subitems(doc, data, item_details, bom_no, company, include_non_stock_items,
	include_subcontracted_items, parent_qty, planned_qty=1):
	items = frappe.db.sql("""
		SELECT
			bom_item.item_code, default_material_request_type, item.item_name,
			ifnull(%(parent_qty)s * sum(bom_item.stock_qty/ifnull(bom.quantity, 1)) * %(planned_qty)s, 0) as qty,
			item.is_sub_contracted_item as is_sub_contracted, bom_item.source_warehouse,
			item.default_bom as default_bom, bom_item.description as description,
			bom_item.stock_uom as stock_uom, item.min_order_qty as min_order_qty, item.safety_stock as safety_stock,
			item_default.default_warehouse, item.purchase_uom, item_uom.conversion_factor
		FROM
			`tabBOM Item` bom_item
			JOIN `tabBOM` bom ON bom.name = bom_item.parent
			JOIN tabItem item ON bom_item.item_code = item.name
			LEFT JOIN `tabItem Default` item_default
				ON item.name = item_default.parent and item_default.company = %(company)s
			LEFT JOIN `tabUOM Conversion Detail` item_uom
				ON item.name = item_uom.parent and item_uom.uom = item.purchase_uom
		where
			bom.name = %(bom)s
			and bom_item.docstatus < 2
			and item.is_stock_item in (1, {0})
		group by bom_item.item_code""".format(0 if include_non_stock_items else 1),{
			'bom': bom_no,
			'parent_qty': parent_qty,
			'planned_qty': planned_qty,
			'company': company
		}, as_dict=1)

	for d in items:
		if not data.get('include_exploded_items') or not d.default_bom:
			if d.item_code in item_details:
				item_details[d.item_code].qty = item_details[d.item_code].qty + d.qty
			else:
				item_details[d.item_code] = d

		if data.get('include_exploded_items') and d.default_bom:
			if ((d.default_material_request_type in ["Manufacture", "Purchase"] and
				not d.is_sub_contracted) or (d.is_sub_contracted and include_subcontracted_items)):
				if d.qty > 0:
					get_subitems(doc, data, item_details, d.default_bom, company,
						include_non_stock_items, include_subcontracted_items, d.qty)
	return item_details

def get_materials_from_other_locations(item, warehouses, new_mr_items, company):
    from erpnext.stock.doctype.pick_list.pick_list import get_available_item_locations
    locations = get_available_item_locations(item.get("item_code"),
        warehouses, item.get("quantity"), company, ignore_validation=True)

    if not locations:
        new_mr_items.append(item)
        return

    required_qty = item.get("quantity")
    for d in locations:
        if required_qty <=0: return

        new_dict = copy.deepcopy(item)
        quantity = required_qty if d.get("qty") > required_qty else d.get("qty")

        if required_qty > 0:
            new_dict.update({
                "quantity": quantity,
                "material_request_type": "Material Transfer",
                "from_warehouse": d.get("warehouse")
            })

            required_qty -= quantity
            new_mr_items.append(new_dict)

    if required_qty:
        item["quantity"] = required_qty
        new_mr_items.append(item)


