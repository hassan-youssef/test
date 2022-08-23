// Copyright (c) 2021, Peter Maged and contributors
// For license information, please see license.txt

// frappe.ui.form.on('BOM Creation Tool', {
// 	// refresh: function(frm) {

// 	// }
// });
// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// License: GNU General Public License v3. See license.txt

frappe.provide("erpnext.bom");

frappe.ui.form.on("BOM Creation Tool", {
  setup: function (frm) {
    frm.set_df_property("company", "hidden", 0);

    frm.custom_make_buttons = {
      "Work Order": "Work Order",
      "Quality Inspection": "Quality Inspection",
    };

    frm.set_query("bom_no", "items", function () {
      return {
        filters: {
          currency: frm.doc.currency,
          company: frm.doc.company,
        },
      };
    });

    frm.set_query("source_warehouse", "items", function () {
      return {
        filters: {
          company: frm.doc.company,
        },
      };
    });

    frm.set_query("item", function () {
      return {
        query:
          "smart_manafacturing.smart_manafacturing.doctype.bom_creation_tool.bom_creation_tool.item_query",
        filters: {
          is_stock_item: 1,
        },
      };
    });

    frm.set_query("project", function () {
      return {
        filters: [["Project", "status", "not in", "Completed, Cancelled"]],
      };
    });

    frm.set_query("item_code", "items", function (doc) {
      return {
        query:
          "smart_manafacturing.smart_manafacturing.doctype.bom_creation_tool.bom_creation_tool.item_query",
        filters: {
          item_code: doc.item,
        },
      };
    });

    frm.set_query("bom_no", "items", function (doc, cdt, cdn) {
      var d = locals[cdt][cdn];
      return {
        filters: {
          item: d.item_code,
          is_active: 1,
          docstatus: 1,
        },
      };
    });
  },

  onload_post_render: function (frm) {
    frm.get_field("items").grid.set_multiple_add("item_code", "qty");
  },

  refresh: function (frm) {
    frm.disable_save();

    frm.add_custom_button(__("Create BOM"), function () {
      frm.events.create_bom(frm);
    });

    frm.toggle_enable("item", frm.doc.__islocal);
    frm.set_df_property("company", "hidden", 0);
    frm.set_indicator_formatter("item_code", function (doc) {
      if (doc.original_item) {
        return doc.item_code != doc.original_item ? "orange" : "";
      }
      return "";
    });

    // if (!frm.doc.__islocal && frm.doc.docstatus < 2) {
    //   frm.add_custom_button(__("Update Cost"), function () {
    //     frm.events.update_cost(frm, true);
    //   });
    //   frm.add_custom_button(__("Browse BOM"), function () {
    //     frappe.route_options = {
    //       bom: frm.doc.name,
    //     };
    //     frappe.set_route("Tree", "BOM");
    //   });
    // }

    // if (frm.doc.docstatus != 0) {
    //   frm.add_custom_button(
    //     __("Work Order"),
    //     function () {
    //       frm.trigger("make_work_order");
    //     },
    //     __("Create")
    //   );

    //   if (frm.doc.has_variants) {
    //     frm.add_custom_button(
    //       __("Variant BOM"),
    //       function () {
    //         frm.trigger("make_variant_bom");
    //       },
    //       __("Create")
    //     );
    //   }

    //   if (frm.doc.inspection_required) {
    //     frm.add_custom_button(
    //       __("Quality Inspection"),
    //       function () {
    //         frm.trigger("make_quality_inspection");
    //       },
    //       __("Create")
    //     );
    //   }

    //   frm.page.set_inner_btn_group_as_primary(__("Create"));
    // }

    // if (frm.doc.items && frm.doc.allow_alternative_item) {
    //   const has_alternative = frm.doc.items.find(
    //     (i) => i.allow_alternative_item === 1
    //   );
    //   if (frm.doc.docstatus == 0 && has_alternative) {
    //     frm.add_custom_button(__("Alternate Item"), () => {
    //       erpnext.utils.select_alternate_items({
    //         frm: frm,
    //         child_docname: "items",
    //         warehouse_field: "source_warehouse",
    //         child_doctype: "BOM Item",
    //         original_item_field: "original_item",
    //         condition: (d) => {
    //           if (d.allow_alternative_item) {
    //             return true;
    //           }
    //         },
    //       });
    //     });
    //   }
    // }

    if (frm.doc.has_variants) {
      frm.set_intro(
        __(
          "This is a Template BOM and will be used to make the work order for {0} of the item {1}",
          [
            `<a class="variants-intro">variants</a>`,
            `<a href="/app/item/${frm.doc.item}">${frm.doc.item}</a>`,
          ]
        ),
        true
      );

      frm.$wrapper.find(".variants-intro").on("click", () => {
        frappe.set_route("List", "Item", { variant_of: frm.doc.item });
      });
    }

    frm.events.get_matrix(frm);
  },
  create_bom(frm) {
    let selected = frm.events.get_selected(frm);
    if (selected.length == 0) {
      frappe.throw(__("Please get Matrix and Select at least one item"));
    }
    frappe.call({
      method:
        "create_bom",
      doc:frm.doc,
      args: {
        selected: selected,
        // doc: frm.doc,
      },
      callback(r) {
        // frm.refresh()
      },
    });
  },
  get_matrix(frm) {
    refresh_field("matrix_items");
    frm.get_field("matrix_items").$wrapper.html(`
	
		<div class = "results"></div>`);
    if (frm.doc.item_ref) {
      frm.events.get_qty_grid(frm);
      // frm.events.get_current_qty(frm)
    }
  },
  get_qty_grid(frm) {
    frm.values = {};
    frm.events.set_table_html(frm);
  },

  set_table_html: function (frm) {
    if (!frm.doc.item_ref) {
      frappe.throw(__("Please Set Item Ref"));
    }

    frappe.call({
      method:
        "smart_manafacturing.smart_manafacturing.doctype.bom_creation_tool.bom_creation_tool.get_items_by_ref",
      args: { doc: frm.doc },
      freeze: true,
      callback: function (r) {
        let html =
          '<table class="table qty-table table-bordered" style="margin:0px; width: 100%">';

        if (r.message.x.length > 0 && r.message.y.length > 0) {
          frm.doc.xname = r.message.xname[0];
          frm.doc.yname = r.message.yname[0];
          let last_Row = `
					  <tr class="text-muted"> 
					  <th>${__("Total")}</th>
					  `;
          html += '<thead style="font-size: 12px">';
          html += '<tr class="text-muted">';
          html += `<th>
					  <div class="form-group frappe-control input-max-width" data-fieldtype="Check" data-fieldname="" title="select all">
							<div class="checkbox">
								<label>
									<span class="input-area check-all" style="display: flex;">
									<input type="checkbox"
									class="select-all"
									 autocomplete="off"
									  class="input-with-feedback" 
									data-fieldtype="Check" 
									data-fieldname="select_all" 
									placeholder="" 
									data-doctype="Job Card"
									></span>
									<span class="disp-area" style="display: none;"><input type="checkbox" disabled="" class="disabled-selected"></span>
									<span class="label-area">${__("All")}</span>
								</label>
								<p class="help-box small text-muted"></p>
							</div>
						</div>
					  
					  </th>`;
          r.message.y.forEach((y) => {
            //html += `<th>${__(y.replace('_', ' '))}</th>`
            html += `
						  <th>
						  <div class="form-group frappe-control input-max-width" data-fieldtype="Check" data-fieldname="select_${y}" title="${__(
              y.replace("_", " ")
            )}">
							<div class="checkbox">
								<label>
									<span class="input-area check-all" style="display: flex;">
									<input type="checkbox"
									class="check-y check-y-${y}"
									 autocomplete="off"
									  class="input-with-feedback" 
									data-fieldtype="Check" 
									data-fieldname="select_${y}" 
									placeholder="" 
									data-doctype=""
									data-y=${y}
								   
									></span>
									<span class="disp-area" style="display: none;"><input type="checkbox" disabled="" class="disabled-selected"></span>
									<span class="label-area">${__(y.replace("_", " "))}</span>
								</label>
								<p class="help-box small text-muted"></p>
							</div>
						</div>
						</th>
						  `;
            last_Row += `<td>
							  <div class="control-input" style="width:50% !important;">
							  <input type="number"   value = '0'  class="input-with-feedback form-control y-total-${y}-controller" 
							  placeholder="total" 
							  data-y=${y}
							  readonly
							  >
							  </div>
							  </td>`;
          });
          //   html += `<th>${__("Total")}</th>`;
          html += "</tr>";
          html += "</thead>";

          html += '<tbody style="font-size: 12px">';
          html += '<tr class="text-muted">';
          html += `<th></th>`;
          html += `<th></th>`;
          r.message.x.forEach((x) => {
            html += "</tr>";

            //html += `<td width='5%'>${__(x.replace('_', ' '))}</td>`
            html += `
						  <td>
						  <div class="form-group frappe-control input-max-width" data-fieldtype="Check" data-fieldname="" title="${__(
                x.replace("_", " ")
              )}">
							<div class="checkbox">
								<label>
									<span class="input-area check-all" style="display: flex;">
									<input type="checkbox"
									 autocomplete="off"
									 class="check-x check-x-${x}"
									  class="input-with-feedback" 
									data-fieldtype="Check" 
									data-fieldname="select_${x}" 
									placeholder="" 
									data-doctype="Job Card"
									data-x=${x}
									></span>
									<span class="disp-area" style="display: none;"><input type="checkbox" disabled="" class="disabled-selected"></span>
									<span class="label-area">${__(x.replace("_", " "))}</span>
								</label>
								<p class="help-box small text-muted"></p>
							</div>
						</div>
						</td>
						  `;

            frm.values[x] = {};
            r.message.y.forEach((y) => {
              let obj = r.message.items.find((i) => i.x == x && i.y == y) || {
                checked: false,
                x: x,
                y: y,
                items: [],
                item_code: "",
                item_name: "",
                qty: 0,
              };

              frm.values[x][y] = obj;

              let disabled = !obj.item_code ? "disabled" : "";

              html += `<td>
	  
							<div class="form-group frappe-control input-max-width" data-fieldtype="Check" data-fieldname="" title="${
                obj.item_name || ""
              } /  ${obj.qty || 0}">
	  
			  
							<div class="checkbox">
								<label  >
									<span class="input-area" style="display: flex;">
									<input type="checkbox"
									class = "bom-item-controller-${x} bom-item-controller-${y} bom-item-controller"
									 autocomplete="off"
									  class="input-with-feedback" 
									data-fieldtype="Check" 
									data-fieldname="${obj.item_code || ""}" 
									placeholder="" 
									data-doctype="Job Card"
									data-x=${x}
									data-y=${y}
									data-item-code = ${obj.item_code || ""}																											r
									data-item = ${obj.item_code} 
									data-qty = ${obj.items || 0} 
								   
								   ${disabled}
									></span>
									<span class="disp-area" style="display: none;"><input type="checkbox" disabled="" class="disabled-selected"></span>
									<span class="label-area">${obj.item_name || ""}</span>

								</label>
								<p class="help-box small text-muted"></p>
							</div>
				  
						</div>
	  
	  
					   
						<!-- controller btn -->


						<div class="form-group">
						<div class="control-input" >
						<input type="number" text = '0' value = '0' 
						class="input-with-feedback form-control qty-${x}-${y}-controller"
					   placeholder="total"
					   readonly
					   >
					   </div>
							<div class="clearfix">						
							<label class="control-label hide" style="padding-right: 0px;">&nbsp;</label>
							</div>	


							<div class="control-input-wrapper">	
								<div class="control-input add-item-btn" style = "margin-top:10px;">
								<button class="btn btn-xs btn-default" 
								data-fieldtype="Button" 
								${disabled}
								data-fieldname="get_matrix" 
								placeholder="" 
								data-doctype="BOM Creation Tool"
								data-item_code = "${obj.item_code}"
								data-x=${x}
								data-y=${y}
								value="">Add Item</button>
								</div>
								<div class="hide" style="display: none;"></div>
							<p class="help-box small text-muted"></p>
							</div>				
						</div>


						
	  
							  </td>`;
            });

            // html += `<td >
            // 			  <div class="control-input" style="width:50% !important;">
            // 			  <input type="number" text = '0' value = '0' class="input-with-feedback form-control x-total-${x}-controller"
            // 			  placeholder="total"
            // 			  data-x=${x}
            // 			  readonly
            // 			  >
            // 			  </div>
            // 			  </td>`;

            html += "</tr>";
          });
          last_Row += `<td>
							  <div class="control-input" style="width:50% !important;">
							  <input type="number"   value = '0'  class="input-with-feedback form-control total-controller" 
							  placeholder="total" 
							  readonly
							  >
							  </div>
							  </td>`;
          last_Row += "</tr>";
          //   html += last_Row;
          html += "</tbody>";
        }
        html += "</table>";
        //debugger
        let f = frm.get_field("matrix_items");
        // frm.get_field("matrix_items").$wrapper.append(html)
        frm.refresh_field("matrix_items");
        let $results = frm.get_field("matrix_items").$wrapper.find(".results");
        $results.html("");
        $results.html(html);
        // frm.events.set_totals(frm, $results);

        $results.on("change", ".select-all", function (e) {
          let checked = e.target.checked;
          $results.find(`.bom-item-controller`).prop("checked", checked);
          frm.events.check_all(frm, $results, checked);
        });
        $results.on("change", ".check-x", function (e) {
          //debugger
          let x = e.target.dataset.x;
          let checked = e.target.checked;
          $results.find(`.bom-item-controller-${x}`).prop("checked", checked);
          frm.events.check_axis(frm, $results, checked, "x", x);
        });

        $results.on("change", ".check-y", function (e) {
          let y = e.target.dataset.y;
          let checked = e.target.checked;
          $results.find(`.bom-item-controller-${y}`).prop("checked", checked);
          frm.events.check_axis(frm, $results, checked, "y", y);
        });

        $results.on("change", ".bom-item-controller", function (e) {
          let y = e.target.dataset.y;
          let x = e.target.dataset.x;
          let checked = e.target.checked;

          frm.values[x][y].checked = checked;

          frm.events.check_selected(frm, $results);
        });

        $results.on("click", ".add-item-btn", function (e) {
          let y = e.target.dataset.y;
          let x = e.target.dataset.x;
          let item_code = e.target.dataset.item_code;
          var dialog = new frappe.ui.Dialog({
            title: __("Add Items"),
            fields: [
              {
                fieldname: "items",
                fieldtype: "Table",
                label: "Items",
                fields: [
                  {
                    fieldtype: "Link",
                    fieldname: "item_code",
                    options: "Item",
                    label: __("Item"),
                    reqd: 1,
                    // read_only:1,
                    in_list_view: 1,
                    onchange() {
                      let items = dialog.get_value("items");
                      frappe.call({
                        method:
                          "smart_manafacturing.smart_manafacturing.doctype.bom_creation_tool.bom_creation_tool.get_items_data",
                        args: {
                          items: items,
                          doc: frm.doc,
                        },
                        callback(r) {
                          dialog.set_value("items", r.message || []);
                          dialog.fields_dict["items"].df.data.forEach((row) => {
                            let item = (r.message || []).find(
                              (x) => x.name == row.name
                            );
                            if (item) {
                              row.item_code = item.item_code;
                              row.item_name = item.item_name;
                              row.rate = item.rate || 0;
                              row.uom = item.uom;
                              row.qty = item.qty;
                            }
                          });
                          // dialog.fields_dict["items"].df.data = r.message || [];
                          console.log("df => ", dialog.fields_dict["items"]);
                          // dialog.set_value('items' ,  r.message || [] )
                          dialog.get_field("items").refresh_input();
                          dialog.get_field("items").refresh();
                          dialog.refresh();
                        },
                      });

                      dialog.get_field("items").refresh_input();
                      dialog.get_field("items").refresh();
                      dialog.refresh();
                    },
                  },
                  {
                    fieldtype: "Data",
                    fieldname: "item_name",
                    label: __("Item name"),
                    reqd: 1,
                    read_only: 1,
                    in_list_view: 1,
                  },
                  {
                    fieldtype: "Link",
                    options: "UOM",
                    fieldname: "uom",
                    label: __("UOM"),
                    reqd: 1,
                    in_list_view: 1,
                  },

                  {
                    fieldtype: "Float",
                    fieldname: "qty",
                    label: __("Qty"),
                    default: 1,
                    in_list_view: 1,
                    reqd: 1,
                  },
                  {
                    fieldtype: "Currency",
                    fieldname: "rate",
                    label: __("Rate"),
                    // default:0,
                    reqd: 1,
                    in_list_view: 1,
                  },
                ],
              },
            ],
            primary_action_label: "Save Items",
            primary_action(args) {
              let items = dialog.get_value("items") || [];
              frm.values[x][y].items = items;
              // alert(values[x][y].items.length)
              let $results = frm
                .get_field("matrix_items")
                .$wrapper.find(".results");
              $results
                .find(`.qty-${x}-${y}-controller`)
                .prop("value", items.length);
              dialog.hide();
            },
          });

          dialog.fields_dict["items"].df.data = frm.values[x][y].items || [];
          dialog.get_field("items").refresh();
          dialog.show();
        });
      },
    });
  },

  check_all: function (frm, $results, checked) {
    $.each(frm.values, function (x, x_value) {
      let total = 0;

      $.each(x_value, function (y, y_value) {
        y_value.checked = checked;
      });
    });
    $results.find(`.check-y`).prop("checked", checked);
    $results.find(`.check-x`).prop("checked", checked);
  },
  check_axis: function (frm, $results, checked, key, params) {
    let check_all = checked;
    let check_x = {};
    let check_y;
    $.each(frm.values, function (x, x_value) {
      let total = 0;
      check_x[x] = true;
      if (key == "x") {
        check_x[params] = checked;
      }
      if (!check_y) {
        check_y = {};
        $.each(x_value, function (y, y_value) {
          check_y[y] = true;
        });
        if (key == "y") {
          check_y[params] = checked;
        }
      }

      $.each(x_value, function (y, y_value) {
        if (y_value[key] == params) {
          y_value.checked = checked;
        }

        if (!y_value.checked) {
          check_all = false;
          check_x[x] = false;
          check_y[y] = false;
        }
      });
    });
    $results.find(`.select-all`).prop("checked", check_all);
    $.each(check_x, function (x, x_checked) {
      $results.find(`.check-x-${x}`).prop("checked", x_checked);
    });
    $.each(check_y, function (y, y_checked) {
      $results.find(`.check-y-${y}`).prop("checked", y_checked);
    });
  },

  check_selected: function (frm, $results) {
    let check_all = true;
    let check_x = {};
    let check_y;
    $.each(frm.values, function (x, x_value) {
      let total = 0;
      check_x[x] = true;

      if (!check_y) {
        check_y = {};
        $.each(x_value, function (y, y_value) {
          check_y[y] = true;
        });
      }

      $.each(x_value, function (y, y_value) {
        if (!y_value.checked) {
          check_all = false;
          check_x[x] = false;
          check_y[y] = false;
        }
      });
    });
    $results.find(`.select-all`).prop("checked", check_all);
    $.each(check_x, function (x, x_checked) {
      $results.find(`.check-x-${x}`).prop("checked", x_checked);
    });
    $.each(check_y, function (y, y_checked) {
      $results.find(`.check-y-${y}`).prop("checked", y_checked);
    });
  },
  get_selected: function (frm) {
    let selected = [];
    $.each(frm.values, function (x, x_value) {
      $.each(x_value, function (y, obj) {
        if (obj.checked && obj.item_code) {
          selected.push(obj);
        }
      });
    });
    return selected;
  },

  make_work_order: function (frm) {
    frm.events.setup_variant_prompt(
      frm,
      "Work Order",
      (frm, item, data, variant_items) => {
        frappe.call({
          method:
            "erpnext.manufacturing.doctype.work_order.work_order.make_work_order",
          args: {
            bom_no: frm.doc.name,
            item: item,
            qty: data.qty || 0.0,
            project: frm.doc.project,
            variant_items: variant_items,
          },
          freeze: true,
          callback: function (r) {
            if (r.message) {
              let doc = frappe.model.sync(r.message)[0];
              frappe.set_route("Form", doc.doctype, doc.name);
            }
          },
        });
      }
    );
  },

  make_variant_bom: function (frm) {
    frm.events.setup_variant_prompt(
      frm,
      "Variant BOM",
      (frm, item, data, variant_items) => {
        frappe.call({
          method:
            "smart_manafacturing.smart_manafacturing.doctype.bom_creation_tool.bom_creation_tool.make_variant_bom",
          args: {
            source_name: frm.doc.name,
            bom_no: frm.doc.name,
            item: item,
            variant_items: variant_items,
          },
          freeze: true,
          callback: function (r) {
            if (r.message) {
              let doc = frappe.model.sync(r.message)[0];
              frappe.set_route("Form", doc.doctype, doc.name);
            }
          },
        });
      },
      true
    );
  },

  setup_variant_prompt: function (frm, title, callback, skip_qty_field) {
    const fields = [];

    if (frm.doc.has_variants) {
      fields.push({
        fieldtype: "Link",
        label: __("Variant Item"),
        fieldname: "item",
        options: "Item",
        reqd: 1,
        get_query: function () {
          return {
            query: "erpnext.controllers.queries.item_query",
            filters: {
              variant_of: frm.doc.item,
            },
          };
        },
      });
    }

    if (!skip_qty_field) {
      fields.push({
        fieldtype: "Float",
        label: __("Qty To Manufacture"),
        fieldname: "qty",
        reqd: 1,
        default: 1,
        onchange: () => {
          const { quantity, items: rm } = frm.doc;
          const variant_items_map = rm.reduce((acc, item) => {
            acc[item.item_code] = item.qty;
            return acc;
          }, {});
          const mf_qty = cur_dialog.fields_list.filter(
            (f) => f.df.fieldname === "qty"
          )[0]?.value;
          const items = cur_dialog.fields.filter(
            (f) => f.fieldname === "items"
          )[0]?.data;

          if (!items) {
            return;
          }

          items.forEach((item) => {
            item.qty = (variant_items_map[item.item_code] * mf_qty) / quantity;
          });

          cur_dialog.refresh();
        },
      });
    }

    var has_template_rm =
      frm.doc.items.filter((d) => d.has_variants === 1) || [];
    if (has_template_rm && has_template_rm.length > 0) {
      fields.push({
        fieldname: "items",
        fieldtype: "Table",
        label: __("Raw Materials"),
        fields: [
          {
            fieldname: "item_code",
            options: "Item",
            label: __("Template Item"),
            fieldtype: "Link",
            in_list_view: 1,
            reqd: 1,
          },
          {
            fieldname: "variant_item_code",
            options: "Item",
            label: __("Variant Item"),
            fieldtype: "Link",
            in_list_view: 1,
            reqd: 1,
            get_query: function (data) {
              if (!data.item_code) {
                frappe.throw(__("Select template item"));
              }

              return {
                query: "erpnext.controllers.queries.item_query",
                filters: {
                  variant_of: data.item_code,
                },
              };
            },
          },
          {
            fieldname: "qty",
            label: __("Quantity"),
            fieldtype: "Float",
            in_list_view: 1,
            reqd: 1,
          },
          {
            fieldname: "source_warehouse",
            label: __("Source Warehouse"),
            fieldtype: "Link",
            options: "Warehouse",
          },
          {
            fieldname: "operation",
            label: __("Operation"),
            fieldtype: "Data",
            hidden: 1,
          },
        ],
        in_place_edit: true,
        data: [],
        get_data: function () {
          return [];
        },
      });
    }

    let dialog = frappe.prompt(
      fields,
      (data) => {
        let item = data.item || frm.doc.item;
        let variant_items = data.items || [];

        variant_items.forEach((d) => {
          if (!d.variant_item_code) {
            frappe.throw(
              __("Select variant item code for the template item {0}", [
                d.item_code,
              ])
            );
          }
        });

        callback(frm, item, data, variant_items);
      },
      __(title),
      __("Create")
    );

    has_template_rm.forEach((d) => {
      dialog.fields_dict.items.df.data.push({
        item_code: d.item_code,
        variant_item_code: "",
        qty: d.qty,
        source_warehouse: d.source_warehouse,
        operation: d.operation,
      });
    });

    if (has_template_rm) {
      dialog.fields_dict.items.grid.refresh();
    }
  },

  make_quality_inspection: function (frm) {
    frappe.model.open_mapped_doc({
      method:
        "erpnext.stock.doctype.quality_inspection.quality_inspection.make_quality_inspection",
      frm: frm,
    });
  },

  update_cost: function (frm, save_doc = false) {
    return frappe.call({
      doc: frm.doc,
      method: "update_cost",
      freeze: true,
      args: {
        update_parent: true,
        save: save_doc,
        from_child_bom: false,
      },
      callback: function (r) {
        refresh_field("items");
        if (!r.exc) frm.refresh_fields();
      },
    });
  },

  rm_cost_as_per: function (frm) {
    if (
      in_list(["Valuation Rate", "Last Purchase Rate"], frm.doc.rm_cost_as_per)
    ) {
      frm.set_value("plc_conversion_rate", 1.0);
    }
  },

  routing: function (frm) {
    if (frm.doc.routing) {
      frappe.call({
        doc: frm.doc,
        method: "get_routing",
        freeze: true,
        callback: function (r) {
          if (!r.exc) {
            frm.refresh_fields();
            erpnext.bom.calculate_op_cost(frm.doc);
            erpnext.bom.calculate_total(frm.doc);
          }
        },
      });
    }
  },
});

// erpnext.bom.BomController = class BomController extends (
//   erpnext.TransactionController
// ) {
//   conversion_rate(doc) {
//     if (this.frm.doc.currency === this.get_company_currency()) {
//       this.frm.set_value("conversion_rate", 1.0);
//     } else {
//       erpnext.bom.update_cost(doc);
//     }
//   }

//   item_code(doc, cdt, cdn) {
//     var scrap_items = false;
//     var child = locals[cdt][cdn];
//     if (child.doctype == "BOM Scrap Item") {
//       scrap_items = true;
//     }

//     if (child.bom_no) {
//       child.bom_no = "";
//     }

//     get_bom_material_detail(doc, cdt, cdn, scrap_items);
//   }

//   buying_price_list(doc) {
//     this.apply_price_list();
//   }

//   plc_conversion_rate(doc) {
//     if (!this.in_apply_price_list) {
//       this.apply_price_list(null, true);
//     }
//   }

//   conversion_factor(doc, cdt, cdn) {
//     if (frappe.meta.get_docfield(cdt, "stock_qty", cdn)) {
//       var item = frappe.get_doc(cdt, cdn);
//       frappe.model.round_floats_in(item, ["qty", "conversion_factor"]);
//       item.stock_qty = flt(
//         item.qty * item.conversion_factor,
//         precision("stock_qty", item)
//       );
//       refresh_field("stock_qty", item.name, item.parentfield);
//       this.toggle_conversion_factor(item);
//       this.frm.events.update_cost(this.frm);
//     }
//   }
// };

// extend_cscript(
//   cur_frm.cscript,
//   new erpnext.bom.BomController({ frm: cur_frm })
// );



erpnext.bom.BomController = erpnext.TransactionController.extend({
	conversion_rate: function(doc) {
		if(this.frm.doc.currency === this.get_company_currency()) {
			this.frm.set_value("conversion_rate", 1.0);
		} else {
			erpnext.bom.update_cost(doc);
		}
	},

	item_code: function(doc, cdt, cdn){
		var scrap_items = false;
		var child = locals[cdt][cdn];
		if (child.doctype == 'BOM Scrap Item') {
			scrap_items = true;
		}

		if (child.bom_no) {
			child.bom_no = '';
		}

		get_bom_material_detail(doc, cdt, cdn, scrap_items);
	},

	buying_price_list: function(doc) {
		this.apply_price_list();
	},

	plc_conversion_rate: function(doc) {
		if (!this.in_apply_price_list) {
			this.apply_price_list(null, true);
		}
	},

	conversion_factor: function(doc, cdt, cdn) {
		if (frappe.meta.get_docfield(cdt, "stock_qty", cdn)) {
			var item = frappe.get_doc(cdt, cdn);
			frappe.model.round_floats_in(item, ["qty", "conversion_factor"]);
			item.stock_qty = flt(item.qty * item.conversion_factor, precision("stock_qty", item));
			refresh_field("stock_qty", item.name, item.parentfield);
			this.toggle_conversion_factor(item);
			this.frm.events.update_cost(this.frm);
		}
	},
});

$.extend(cur_frm.cscript, new erpnext.bom.BomController({frm: cur_frm}));


cur_frm.cscript.hour_rate = function (doc) {
  erpnext.bom.calculate_op_cost(doc);
  erpnext.bom.calculate_total(doc);
};

cur_frm.cscript.time_in_mins = cur_frm.cscript.hour_rate;

cur_frm.cscript.bom_no = function (doc, cdt, cdn) {
  get_bom_material_detail(doc, cdt, cdn, false);
};

cur_frm.cscript.is_default = function (doc) {
  if (doc.is_default) cur_frm.set_value("is_active", 1);
};

var get_bom_material_detail = function (doc, cdt, cdn, scrap_items) {
  if (!doc.company) {
    frappe.throw({
      message: __("Please select a Company first."),
      title: __("Mandatory"),
    });
  }

  var d = locals[cdt][cdn];
  if (d.item_code) {
    return frappe.call({
      doc: doc,
      method: "get_bom_material_detail",
      args: {
        company: doc.company,
        item_code: d.item_code,
        bom_no: d.bom_no != null ? d.bom_no : "",
        scrap_items: scrap_items,
        qty: d.qty,
        stock_qty: d.stock_qty,
        include_item_in_manufacturing: d.include_item_in_manufacturing,
        uom: d.uom,
        stock_uom: d.stock_uom,
        conversion_factor: d.conversion_factor,
        sourced_by_supplier: d.sourced_by_supplier,
      },
      callback: function (r) {
        d = locals[cdt][cdn];
        if (d.is_process_loss) {
          r.message.rate = 0;
          r.message.base_rate = 0;
        }

        $.extend(d, r.message);
        refresh_field("items");
        refresh_field("scrap_items");

        doc = locals[doc.doctype][doc.name];
        erpnext.bom.calculate_rm_cost(doc);
        erpnext.bom.calculate_scrap_materials_cost(doc);
        erpnext.bom.calculate_total(doc);
      },
      freeze: true,
    });
  }
};

cur_frm.cscript.qty = function (doc) {
  erpnext.bom.calculate_rm_cost(doc);
  erpnext.bom.calculate_scrap_materials_cost(doc);
  erpnext.bom.calculate_total(doc);
};

cur_frm.cscript.rate = function (doc, cdt, cdn) {
  var d = locals[cdt][cdn];
  var scrap_items = false;

  if (cdt == "BOM Scrap Item") {
    scrap_items = true;
  }

  if (d.bom_no) {
    frappe.msgprint(
      __("You cannot change the rate if BOM is mentioned against any Item.")
    );
    get_bom_material_detail(doc, cdt, cdn, scrap_items);
  } else {
    erpnext.bom.calculate_rm_cost(doc);
    erpnext.bom.calculate_scrap_materials_cost(doc);
    erpnext.bom.calculate_total(doc);
  }
};

erpnext.bom.update_cost = function (doc) {
  erpnext.bom.calculate_op_cost(doc);
  erpnext.bom.calculate_rm_cost(doc);
  erpnext.bom.calculate_scrap_materials_cost(doc);
  erpnext.bom.calculate_total(doc);
};

erpnext.bom.calculate_op_cost = function (doc) {
  var op = doc.operations || [];
  doc.operating_cost = 0.0;
  doc.base_operating_cost = 0.0;

  for (var i = 0; i < op.length; i++) {
    var operating_cost = flt(
      (flt(op[i].hour_rate) * flt(op[i].time_in_mins)) / 60,
      2
    );
    var base_operating_cost = flt(operating_cost * doc.conversion_rate, 2);
    frappe.model.set_value(
      "BOM Operation",
      op[i].name,
      "operating_cost",
      operating_cost
    );
    frappe.model.set_value(
      "BOM Operation",
      op[i].name,
      "base_operating_cost",
      base_operating_cost
    );

    doc.operating_cost += operating_cost;
    doc.base_operating_cost += base_operating_cost;
  }
  refresh_field(["operating_cost", "base_operating_cost"]);
};

// rm : raw material
erpnext.bom.calculate_rm_cost = function (doc) {
  var rm = doc.items || [];
  var total_rm_cost = 0;
  var base_total_rm_cost = 0;
  for (var i = 0; i < rm.length; i++) {
    var amount = flt(rm[i].rate) * flt(rm[i].qty);
    var base_amount = amount * flt(doc.conversion_rate);

    frappe.model.set_value(
      "BOM Item",
      rm[i].name,
      "base_rate",
      flt(rm[i].rate) * flt(doc.conversion_rate)
    );
    frappe.model.set_value("BOM Item", rm[i].name, "amount", amount);
    frappe.model.set_value("BOM Item", rm[i].name, "base_amount", base_amount);
    frappe.model.set_value(
      "BOM Item",
      rm[i].name,
      "qty_consumed_per_unit",
      flt(rm[i].stock_qty) / flt(doc.quantity)
    );

    total_rm_cost += amount;
    base_total_rm_cost += base_amount;
  }
  cur_frm.set_value("raw_material_cost", total_rm_cost);
  cur_frm.set_value("base_raw_material_cost", base_total_rm_cost);
};

// sm : scrap material
erpnext.bom.calculate_scrap_materials_cost = function (doc) {
  var sm = doc.scrap_items || [];
  var total_sm_cost = 0;
  var base_total_sm_cost = 0;

  for (var i = 0; i < sm.length; i++) {
    var base_rate = flt(sm[i].rate) * flt(doc.conversion_rate);
    var amount = flt(sm[i].rate) * flt(sm[i].stock_qty);
    var base_amount = amount * flt(doc.conversion_rate);

    frappe.model.set_value(
      "BOM Scrap Item",
      sm[i].name,
      "base_rate",
      base_rate
    );
    frappe.model.set_value("BOM Scrap Item", sm[i].name, "amount", amount);
    frappe.model.set_value(
      "BOM Scrap Item",
      sm[i].name,
      "base_amount",
      base_amount
    );

    total_sm_cost += amount;
    base_total_sm_cost += base_amount;
  }

  cur_frm.set_value("scrap_material_cost", total_sm_cost);
  cur_frm.set_value("base_scrap_material_cost", base_total_sm_cost);
};

// Calculate Total Cost
erpnext.bom.calculate_total = function (doc) {
  var total_cost =
    flt(doc.operating_cost) +
    flt(doc.raw_material_cost) -
    flt(doc.scrap_material_cost);
  var base_total_cost =
    flt(doc.base_operating_cost) +
    flt(doc.base_raw_material_cost) -
    flt(doc.base_scrap_material_cost);

  cur_frm.set_value("total_cost", total_cost);
  cur_frm.set_value("base_total_cost", base_total_cost);
};

cur_frm.cscript.validate = function (doc) {
  erpnext.bom.update_cost(doc);
};

frappe.ui.form.on("BOM Operation", "operation", function (frm, cdt, cdn) {
  var d = locals[cdt][cdn];

  if (!d.operation) return;

  frappe.call({
    method: "frappe.client.get",
    args: {
      doctype: "Operation",
      name: d.operation,
    },
    callback: function (data) {
      if (data.message.description) {
        frappe.model.set_value(
          d.doctype,
          d.name,
          "description",
          data.message.description
        );
      }
      if (data.message.workstation) {
        frappe.model.set_value(
          d.doctype,
          d.name,
          "workstation",
          data.message.workstation
        );
      }
    },
  });
});

frappe.ui.form.on("BOM Operation", "workstation", function (frm, cdt, cdn) {
  var d = locals[cdt][cdn];

  frappe.call({
    method: "frappe.client.get",
    args: {
      doctype: "Workstation",
      name: d.workstation,
    },
    callback: function (data) {
      frappe.model.set_value(
        d.doctype,
        d.name,
        "base_hour_rate",
        data.message.hour_rate
      );
      frappe.model.set_value(
        d.doctype,
        d.name,
        "hour_rate",
        flt(flt(data.message.hour_rate) / flt(frm.doc.conversion_rate)),
        2
      );

      erpnext.bom.calculate_op_cost(frm.doc);
      erpnext.bom.calculate_total(frm.doc);
    },
  });
});

frappe.ui.form.on("BOM Item", "qty", function (frm, cdt, cdn) {
  var d = locals[cdt][cdn];
  d.stock_qty = d.qty * d.conversion_factor;
  refresh_field("stock_qty", d.name, d.parentfield);
});

frappe.ui.form.on("BOM Item", "item_code", function (frm, cdt, cdn) {
  var d = locals[cdt][cdn];
  frappe.db.get_value(
    "Item",
    { name: d.item_code },
    "allow_alternative_item",
    (r) => {
      d.allow_alternative_item = r.allow_alternative_item;
    }
  );
  refresh_field("allow_alternative_item", d.name, d.parentfield);
});

frappe.ui.form.on("BOM Item", "sourced_by_supplier", function (frm, cdt, cdn) {
  var d = locals[cdt][cdn];
  if (d.sourced_by_supplier) {
    d.rate = 0;
    refresh_field("rate", d.name, d.parentfield);
  }
});

frappe.ui.form.on("BOM Item", "rate", function (frm, cdt, cdn) {
  var d = locals[cdt][cdn];
  if (d.sourced_by_supplier) {
    d.rate = 0;
    refresh_field("rate", d.name, d.parentfield);
  }
});

frappe.ui.form.on("BOM Operation", "operations_remove", function (frm) {
  erpnext.bom.calculate_op_cost(frm.doc);
  erpnext.bom.calculate_total(frm.doc);
});

frappe.ui.form.on("BOM Item", "items_remove", function (frm) {
  erpnext.bom.calculate_rm_cost(frm.doc);
  erpnext.bom.calculate_total(frm.doc);
});

frappe.tour["BOM"] = [
  {
    fieldname: "item",
    title: "Item",
    description: __(
      "Select the Item to be manufactured. The Item name, UoM, Company, and Currency will be fetched automatically."
    ),
  },
  {
    fieldname: "quantity",
    title: "Quantity",
    description: __(
      "Enter the quantity of the Item that will be manufactured from this Bill of Materials."
    ),
  },
  {
    fieldname: "with_operations",
    title: "With Operations",
    description: __("To add Operations tick the 'With Operations' checkbox."),
  },
  {
    fieldname: "items",
    title: "Raw Materials",
    description: __(
      "Select the raw materials (Items) required to manufacture the Item"
    ),
  },
];

frappe.ui.form.on("BOM Scrap Item", {
  item_code(frm, cdt, cdn) {
    const { item_code } = locals[cdt][cdn];
    if (item_code === frm.doc.item) {
      locals[cdt][cdn].is_process_loss = 1;
      trigger_process_loss_qty_prompt(frm, cdt, cdn, item_code);
    }
  },
});

function trigger_process_loss_qty_prompt(frm, cdt, cdn, item_code) {
  frappe.prompt(
    {
      fieldname: "percent",
      fieldtype: "Percent",
      label: __("% Finished Item Quantity"),
      description:
        __("Set quantity of process loss item:") +
        ` ${item_code} ` +
        __("as a percentage of finished item quantity"),
    },
    (data) => {
      const row = locals[cdt][cdn];
      row.stock_qty = (frm.doc.quantity * data.percent) / 100;
      row.qty = row.stock_qty / (row.conversion_factor || 1);
      refresh_field("scrap_items");
    },
    __("Set Process Loss Item Quantity"),
    __("Set Quantity")
  );
}
