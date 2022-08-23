// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt
var values = {};
var from_sales_order = false;

frappe.ui.form.on("Production Plan", {
  get_items_for_mr: function (frm) {
    // alert('xx')
    if (frm.doc.ignore_existing_ordered_qty) {
      frm.events.get_items_for_material_requests(frm);
    } else {
      // if (!frm.doc.for_warehouse) {
      //   frappe.throw(__("Select warehouse for material requests"));
      // }
      const title = __("Transfer Materials For Warehouse {0}", [
        frm.doc.for_warehouse,
      ]);
      var dialog = new frappe.ui.Dialog({
        title: title,
        fields: [
          {
            fieldtype: "Table MultiSelect",
            label: __("Source Warehouses (Optional)"),
            fieldname: "warehouses",
            options: "Production Plan Material Request Warehouse",
            description: __(
              "System will pickup the materials from the selected warehouses. If not specified, system will create material request for purchase."
            ),
            get_query: function () {
              return {
                filters: {
                  company: frm.doc.company,
                },
              };
            },
          },
        ],
      });

      dialog.show();

      dialog.set_primary_action(__("Get Items"), () => {
        let warehouses = dialog.get_values().warehouses;
        frm.events.get_items_for_material_requests(frm, warehouses);
        dialog.hide();
      });
    }
  },
  get_items_for_material_requests: function (frm, warehouses) {
    const set_fields = [
      "actual_qty",
      "item_code",
      "item_name",
      "description",
      "uom",
      "from_warehouse",
      "min_order_qty",
      "required_bom_qty",
      "quantity",
      "sales_order",
      "warehouse",
      "projected_qty",
      "ordered_qty",
      "reserved_qty_for_production",
      "material_request_type",
    ];

    frappe.call({
      // method: "smart_manafacturing.smart_manafacturing.doctype.production_plan.production_plan.get_items_for_material_requests",
      method:
        "erpnext.manufacturing.doctype.production_plan.production_plan.get_items_for_material_requests",
      freeze: true,
      args: {
        doc: frm.doc,
        warehouses: warehouses || [],
      },
      callback: function (r) {
        if (r.message) {
          frm.set_value("mr_items", []);
          $.each(r.message, function (i, d) {
            var item = frm.add_child("mr_items");
            for (let key in d) {
              if (d[key] && in_list(set_fields, key)) {
                item[key] = d[key];
              }
            }
          });
        }
        refresh_field("mr_items");
      },
    });
  },
  onload(frm) {
    refresh_field("qty_table");
    frm.get_field("qty_table").$wrapper.html('<div class = "results"></div');
    //    frm.get_field("qty_table").$wrapper.append('<div class = "results"></div')
  },
  init_matrix(frm, sales_order, item_ref) {
    frm.get_field("qty_table").$wrapper.html('<div class = "results"></div');
    refresh_field("qty_table");
    // frm.doc.values = {};
    values = {};
    frm.doc.cur_sales_order = null;
    frm.doc.cur_item_ref = null;
    from_sales_order = true;

    frm.refresh_field("cur_item_ref");
    if (item_ref) {
      frm.doc.cur_sales_order = sales_order;
      frm.doc.cur_item_ref = item_ref;
      cur_frm.doc.cur_sales_order = sales_order;
      cur_frm.doc.cur_item_ref = item_ref;
      frm.refresh_field("cur_item_ref");
      // frm.doc.values = {
      //   sales_order: sales_order,
      //   item_ref: item_ref,
      // };

      frm.events.set_table_html(frm, item_ref);
    }
  },

  show_qty_matrix: function (frm) {
    var item_ref = frm.doc.filter_item_ref;
    if (!item_ref) {
      frappe.throw(__("Please set item ref"));
    }

    frm.get_field("qty_table").$wrapper.html('<div class = "results"></div');
    refresh_field("qty_table");
    // frm.doc.values = {};
    values = {};
    frm.doc.cur_sales_order = null;
    frm.doc.cur_item_ref = null;

    frm.refresh_field("cur_item_ref");
    if (item_ref) {
      from_sales_order = false;
      frm.doc.cur_item_ref = item_ref;
      cur_frm.doc.cur_item_ref = item_ref;
      frm.refresh_field("cur_item_ref");
      // frm.doc.values = {
      //   sales_order: sales_order,
      //   item_ref: item_ref,
      // };

      frm.events.set_table_html(frm, item_ref);
    }
  },

  clear_matrix(frm) {
    frm.events.update_all_matrix_qtyEvent(frm, 0);
  },
  get_current_qty(frm) {
    // frm.doc.values = {}
    if (
      (!frm.doc.cur_sales_order && from_sales_order) ||
      !frm.doc.cur_item_ref
    ) {
      frappe.throw(__("Please Select Sales Order"));
    }
    let $results = frm.get_field("qty_table").$wrapper.find(".results");
    frappe.call({
      method:
        "smart_manafacturing.smart_manafacturing.doctype.production_plan.production_plan.get_items_data",
      args: {
        doc: frm.doc,
        from_sales_order:from_sales_order
      },
      freeze: true,
      callback: async function (r) {
        try {
          // debugger;

          if (r.message) {

            if (
              frm.doc.po_items &&
              frm.doc.cur_item_ref &&
              (frm.doc.cur_sales_order || !from_sales_order)
            ) {
              r.message.forEach((e) => {
                // debugger;
                let obj =
                  (frm.doc.po_items || []).find(
                    (x) =>
                      x.item_code == e.item_code &&
                      (x.sales_order == frm.doc.cur_sales_order ||
                        !from_sales_order)
                  ) || {};
                if (e.x && e.y && e.item_ref) {
                  let x = e.x.replace(" ", "_");
                  let y = e.y.replace(" ", "_");
                  if (
                    e.item_ref == frm.doc.cur_item_ref &&
                    (e.sales_order == frm.doc.cur_sales_order ||
                      !from_sales_order)
                  ) {
                    // frm.doc.values[x][y] = e.planned_qty;
                    values[x][y] = obj.planned_qty || e.planned_qty;
                    $results
                      .find(`.qty-controller-${x}-${y}`)
                      .prop("value", obj.planned_qty || e.planned_qty);
                    // $results
                    //   .find(`.qty-controller-${x}-${y}-planned_qty`)
                    //   .prop("innerHTML", `Planned Qty : ${e.planned_qty}`); //= `Planned Qty : ${e.planned_qty}`;
                    // $results
                    //   .find(`.qty-controller-${x}-${y}-planned_qty`)
                    //   .prop("innerText", `Planned Qty : ${e.planned_qty}`); // = `Planned Qty : ${e.planned_qty}`;
                    $results.find(`.qty-controller-${x}-${y}-planned_qty`);

                    // let elem = $results.find(
                    //   `.qty-controller-${x}-${y}-planned_qty`
                    // );
                    // elem.innerText = `Planned Qty : ${e.planned_qty}`;

                    // .prop("value", e.planned_qty);
                  }
                }
              });
              frm.events.set_totals(frm, $results);
            }
            frm.refresh_field("po_items");
          }
        } catch (err) {}
      },
    });
  },
  update_items(frm) {
    //frm.doc.values = {}
    frm.events.update_items_qty(frm);
  },
  update_all_matrix_qty(frm) {
    // frm.doc.values = {}
    //frm.events.set_table_html(frm)
    let qty = parseInt(frm.doc.bulk_qty, 10);
    if (isNaN(qty)) {
      frappe.throw(__("Please Set Bulk Qty with valid qty"));
    }
    frm.events.update_all_matrix_qtyEvent(frm, qty);
  },
  update_all_matrix_qtyEvent(frm, qty) {
    // frm.doc.values = {}
    //frm.events.set_table_html(frm)
    // $.each(frm.doc.values, function (x, x_value) {
    $.each(values, function (x, x_value) {
      $.each(x_value, function (y, y_value) {
        // frm.doc.values[x][y] = qty;
        values[x][y] = qty;
      });
    });
    let $results = frm.get_field("qty_table").$wrapper.find(".results");
    $results.find(`.qty-controller`).prop("value", qty);
    frm.events.set_totals(frm, $results);
  },
  set_totals: function (frm, $results) {
    let xtotals = {};
    let ytotals = {};
    let flag = true;
    let totalxy = 0;
    // $.each(frm.doc.values, function (x, xvalue) {
    $.each(values, function (x, xvalue) {
      let total = 0;

      // console.log(x, xvalue);
      $.each(xvalue, function (y, value) {
        let compy = $results.find(`.y-total-${y}-controller`);
        total += value || 0;
        totalxy += value || 0;
        if (flag) {
          let ytotal = 0;
          // $.each(frm.doc.values, function (xx, xxvalue) {
          $.each(values, function (xx, xxvalue) {
            // ytotal += frm.doc.values[xx][y];
            ytotal += values[xx][y] || 0;
          });
          debugger

          compy.prop("value", ytotal);
        }
        //console.log(y, value);
      });
      flag = false;
      $results.find(`.x-total-${x}-controller`).prop("value", total);
    });
    $results.find(`.total-controller`).prop("value", totalxy);
  },
  set_table_html: function (frm, item_ref) {
    // if (!item_ref) {
    //   frappe.throw(__("Please Set Item Ref"));
    // }
    if (
      (!frm.doc.cur_sales_order && from_sales_order) ||
      !frm.doc.cur_item_ref
    ) {
      frappe.throw(__("Please Select Sales Order"));
    }
    frappe.call({
      method:
        "smart_manafacturing.smart_manafacturing.doctype.production_plan.production_plan.get_x_y",
      args: {
        item_ref: item_ref,
      },
      freeze: true,
      callback: function (r) {
        let html = ``;
        if (frm.doc.cur_sales_order && frm.doc.cur_item_ref)
          html += `
          <h3> Sales Order : ${frm.doc.cur_sales_order} Item Ref : ${frm.doc.cur_item_ref}</h3>
          `;
        html += `<table class="table qty-table table-bordered" style="margin:0px; width: 100%">`;

        if (r.message.x.length > 0 && r.message.y.length > 0) {
          frm.doc.xname = r.message.xname[0];
          frm.doc.yname = r.message.yname[0];
          let last_Row = `
                    <tr class="text-muted"> 
                    <th>${__("Total")}</th>
                    `;
          html += '<thead style="font-size: 12px">';
          html += '<tr class="text-muted">';
          html += `<th></th>`;
          r.message.y.forEach((y) => {
            html += `<th>${__(y.replace("_", " "))}</th>`;
            last_Row += `<td>
                            <div class="control-input">
                            <input type="number"   value = '0'  class="input-with-feedback form-control y-total-${y}-controller" minlength="140"
                            placeholder="total" 
                            data-y=${y}
                            readonly
                            >
                            </div>
                            </td>`;
          });
          html += `<th>${__("Total")}</th>`;
          html += "</tr>";
          html += "</thead>";

          html += '<tbody style="font-size: 12px">';
          html += '<tr class="text-muted">';
          html += `<th></th>`;
          html += `<th></th>`;
          r.message.x.forEach((x) => {
            html += "</tr>";
            html += `<td>${__(x.replace("_", " "))}</td>`;
            // frm.doc.values[x] = {};
            values[x] = {};
            r.message.y.forEach((y) => {
              // frm.doc.values[x][y] = 0;
              values[x][y] = 0;

              /*html+= `<td>
                            <div class="field-area" style="display: block;">
                            <div class="form-group frappe-control input-max-width" data-fieldtype="Float" data-fieldname="qty" 
                            title="qty"><input type="text" autocomplete="off" class="input-with-feedback
                             form-control bold input-sm" data-fieldtype="Float" data-fieldname="qty" 
                             placeholder="Qty" data-x=${x}
                             data-y=${y}
                             type="number"
                             data-col-idx="2">
                            </div></div>
                            </td>
                            `*/

              html += `<td>


              <div class = "section-body">
            <!--  <Label>
              <span 
              id="qty-controller-${x}-${y}-planned_qty"
              class="label-area qty-controller-${x}-${y}-planned_qty"
              placeholder="Sales Order Qty" 
              data-x=${x}
              data-y=${y}
              >Planned Qty : 0</span>
              </Label>-->

              <!-- <div class = "form-column col-md-4">
              
    
              <div class="control-input">
              <input type="number" value = '0' class="input-with-feedback form-control qty-controller-${x}-${y}-planned_qty" minlength="80"
              placeholder="Sales Order Qty" 
              data-x=${x}
              data-y=${y}
              readonly
              >
              </div>
          </div>
          <div class = "form-column col-md-6">-->
    
              <div class="control-input">
              <input type="number" value = '0' class="input-with-feedback form-control qty-controller  qty-controller-${x}-${y}" minlength="80"
              placeholder="Sales Order Qty" 
              data-x=${x}
              data-y=${y}
              >
              </div>
             
             <!-- </div>-->

              </div>


            
              
              
              
                            
                            
                            </td>`;
            });
            html += `<td>
            <div class = "section-body">
              <Label>
              <span 
              class="label-area"
              placeholder="Sales Order Qty" 
              data-x=${x}
              ></span>
              </Label>
                        <div class="control-input">
                        <input type="number" text = '0' value = '0' class="input-with-feedback form-control x-total-${x}-controller"
                        placeholder="total" 
                        data-x=${x}
                        style="width: 100% !important;"
                        readonly
                        >
                        </div>
                        </div>
                        </td>`;

            html += "</tr>";
          });
          last_Row += `<td >
                            <div class="control-input">
                            <input type="number"   value = '0'  class="input-with-feedback form-control total-controller" 
                            placeholder="total" 
                            style="width: 100% !important;"

                            readonly
                            >
                            </div>
                            </td>`;
          last_Row += "</tr>";
          html += last_Row;
          html += "</tbody>";
        }
        html += "</table>";
        //debugger
        let f = frm.get_field("qty_table");
        // frm.get_field("qty_table").$wrapper.append(html)

        frm.refresh_field("qty_table");
        let $results = frm.get_field("qty_table").$wrapper.find(".results");
        $results.html("");
        $results.html(html);
        $results.on("change", ".qty-controller", function (e) {
          //debugger
          let x = e.target.dataset.x;
          let y = e.target.dataset.y;
          let value = e.target.value || "0";
          // debugger;
          // frm.doc.values[x][y] = parseInt(value);
          values[x][y] = parseInt(value);
          //frm.events.update_items_qty(frm,x,y)

          frm.events.set_totals(frm, $results);
        });
        frm.events.get_current_qty(frm);
      },
    });

    /*const promisxes = frm.qty_table.map(r => {
			const state = r[frm.doc.workflow_state_field];
			return frappe.utils.get_indicator_color(state).then(color => {
				return `<tr>
				<td>
					<div class="indicator ${color}">
						<a class="text-muted orphaned-state">${r[frm.doc.workflow_state_field]}</a>
					</div>
				</td>
				<td>${r.count}</td></tr>`;
			});
		});

		Promise.all(promises).then(rows => {
			const rows_html = rows.join('');
			frm.state_table_html = (
                `<table class="table qty-table table-bordered" style="margin:0px; width: 65%">
				<thead style="font-size: 12px">
					<tr class="text-muted">
						<th>${__('State')}</th>
						<th>${__('Count')}</th>
					</tr>
				</thead>
				<tbody>
					${rows_html}
				</tbody>
			</table>`);
		});*/
  },
  item_ref(frm) {
    if (frm.doc.cur_item_ref) {
      //frm.events.set_table_html(frm)
    }
  },
  add_matrix_items: function (frm) {
    // debugger;
    if (
      (!frm.doc.cur_sales_order && from_sales_order) ||
      !frm.doc.cur_item_ref
    ) {
      frappe.throw(__("Please Select Sales Order"));
    }
    frappe.call({
      method: "get_current_so_items",
      freeze: true,
      doc: frm.doc,
      args: {
        sales_order: frm.doc.cur_sales_order || "",
        item_ref: frm.doc.cur_item_ref,
      },
      callback: function () {
        frm.events.update_items_qty(frm);
        refresh_field("po_items");
      },
    });
  },
  get_items_by_ref(frm) {
    frm.events.get_items_by_refEvent(frm);

    frm.refresh_field("po_items");
  },
  async get_items_by_refEvent(frm) {
    if (!frm.doc.cur_item_ref) {
      frappe.throw(__("Please Set Item Ref"));
    }
    frappe.call({
      method:
        "smart_manafacturing.smart_manafacturing.doctype.production_plan.production_plan.get_items_by_ref",
      args: {
        doc: frm.doc,
      },
      freeze: true,
      callback: async function (r) {
        frappe.dom.freeze();
        try {
          if (r.message) {
            if (r.message.length > 0) {
              r.message.forEach(async (e) => {
                if (e.x && e.y) {
                  console.log(e.x, e.y);
                  // if (frm.doc.values[e.x][e.y] != 0) {
                  if (values[e.x][e.y] != 0) {
                    // e.qty = frm.doc.values[e.x][e.y];
                    e.qty = values[e.x][e.y];
                    e.amount = e.rate * e.qty;
                    e.base_amount = e.base_price_list_rate * e.qty;
                    e.net_amount = e.amount;
                    e.net_rate = e.price_list_rate;
                    e.base_net_rate = e.base_price_list_rate;
                    e.base_net_amount = e.base_amount;
                    e.x = e.x.replace("_", " ");
                    e.y = e.y.replace("_", " ");
                    let row = frm.add_child("po_items", e);

                    /*
                  {
                    item_code:e.item_code,
                    item_name:e.item_name,
                    uom:e.uom,
                    description:e.description,
                    price_list_rate:price_list_rate,
                    rate:price_list_rate,
                    
                    delivery_date:frm.doc.delivery_date,
                    qty:frm.doc.values[e.x][e.y],
                    x:e.x.replace("_", " "),
                    y:e.y.replace("_", " "),
                    item_ref:frm.doc.cur_item_ref
                  }
                  */
                    //if(frappe.meta.get_docfield(row.doctype, "price_list_rate", row.name)) {
                    //await frm.script_manager.trigger("item_code", row.doctype, row.name);

                    //}
                    //await frm.events.new_item(frm,row.doctype,row.name)

                    console.log(row.doctype, row.name);
                    //frm.refresh_field("po_items");
                  }
                }
              });
            }
          }
        } catch (err) {}
        // frm.trigger("price_list_rate");

        frm.refresh_field("po_items");
        frm.refresh_fields();
        frm.refresh();
        frappe.dom.unfreeze();
        //frm.save()
      },
    });
  },
  async update_items_qty(frm) {
    if (
      (!frm.doc.cur_sales_order && from_sales_order) ||
      !frm.doc.cur_item_ref
    ) {
      frappe.throw(__("Please Select Sales Order"));
    }
    frappe.call({
      method:
        "smart_manafacturing.smart_manafacturing.doctype.production_plan.production_plan.get_items_data",
      args: {
        doc: frm.doc,
        from_sales_order: from_sales_order,
      },
      freeze: true,
      callback: async function (r) {
        try {
          if (r.message) {
            if (
              frm.doc.po_items &&
              frm.doc.cur_item_ref &&
              (frm.doc.cur_sales_order || !from_sales_order)
            ) {
              // debugger;

              frm.doc.po_items.forEach((e) => {
                let obj =
                  r.message.find((x) => x.item_code == e.item_code) || {};
                e.x = obj.x;
                e.y = obj.y;
                if (e.x && e.y && e.item_ref) {
                  let x = e.x.replace(" ", "_");
                  let y = e.y.replace(" ", "_");
                  if (
                    e.item_ref == frm.doc.cur_item_ref &&
                    (e.sales_order == frm.doc.cur_sales_order ||
                      !from_sales_order)
                  ) {
                    // e.planned_qty = frm.doc.values[x][y] || 0;
                    e.planned_qty = values[x][y] || 0;
                    // $results.find(`.qty-controller-${x}-${y}`).prop("value", e.planned_qty);
                  }
                }
              });
              //frm.events.set_totals(frm, $results);
              frm.refresh_field("po_items");
            }
          }
        } catch (err) {}
      },
    });

    //frm.events.set_totals(frm, $results);
    frm.refresh_field("po_items");

    // if (frm.doc.po_items && frm.doc.cur_item_ref) {
    //   frm.doc.po_items.forEach(async (e) => {
    //     if (e.x && e.y && e.item_ref) {
    //       let x = e.x.replace(" ", "_");
    //       let y = e.y.replace(" ", "_");
    //       if (e.item_ref == frm.doc.cur_item_ref) {
    //         e.qty = frm.doc.values[x][y];
    //         //await frm.trigger("qty", e.doctype, e.name);
    //       }
    //     }
    //   });
    // }
    // frm.refresh_field("po_items");
  },
  new_item(frm, cdt, cdn) {
    return new Promise((resolve, reject) => {
      //here our function should be implemented
      setTimeout(
        () =>
          frm.script_manager.trigger("item_code", cdt, cdn).then(() => {
            console.log("finish", cdn);
          }),
        5000
      );
    });
  },
});

frappe.ui.form.on("Production Plan Sales Order", {
  show_qty_matrix: function (frm, cdt, cdn) {
    var d = locals[cdt][cdn];
    frappe.call({
      method:
        "smart_manafacturing.smart_manafacturing.doctype.production_plan.production_plan.get_item_ref_query",
      args: {
        sales_order: d.sales_order,
        item_ref: frm.doc.filter_item_ref,
      },
      freeze: true,
      callback: async function (r) {
        try {
          if (r.message) {
            var dialog = new frappe.ui.Dialog({
              title: __("Please Set Item Ref"),
              fields: [
                {
                  label: "Item Ref",
                  fieldname: "item_ref",
                  fieldtype: "Select",
                  options: r.message,
                  //default:frm.doc.values.item_ref,
                  reqd: 1,
                },
              ],
              primary_action: function () {
                var data = dialog.get_values();
                frm.events.init_matrix(frm, d.sales_order, data.item_ref);
                dialog.hide();
              },
              primary_action_label: __("get Matrix"),
            });
            if (r.message.length == 0) {
              frappe.msgprint(
                __(
                  `Sales Order ${d.sales_order} don't have any Item Ref matched with filters`
                )
              );
              frm.events.init_matrix(frm, d.sales_order, null);
            } else {
              dialog.show();
            }
          }
        } catch (err) {}
        // frm.trigger("price_list_rate");

        //frm.save()
      },
    });
  },
});
