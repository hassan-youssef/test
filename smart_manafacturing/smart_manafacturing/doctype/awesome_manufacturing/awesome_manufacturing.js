// Copyright (c) 2021, Peter Maged and contributors
// For license information, please see license.txt

frappe.ui.form.on("Awesome Manufacturing", {
  // refresh: function(frm) {
  // }
  onload(frm) {
    frappe.require([
      "assets/smart_manafacturing/css/awesome_manufacturing.css",
    ]);
    refresh_field("work_orders");
    frm.get_field("work_orders").$wrapper.html('<div class = "results"></div');
    frm.doc.styles = {
      Draft: "red",
      Stopped: "red",
      "Not Started": "red",
      "In Process": "orange",
      Completed: "green",
      Cancelled: "gray",
    };
    //    frm.get_field("qty_table").$wrapper.append('<div class = "results"></div')
  },
  get_work_order(frm) {
    frm.doc.values = {};
    frm.events.set_table_html(frm);
  },

  item_ref:function(frm){
    if (!frm.doc.item_ref)
      return
    frappe.call({
      method:"smart_manafacturing.smart_manafacturing.doctype.awesome_manufacturing.awesome_manufacturing.get_available_dates",
      args:{
        item_ref:frm.doc.item_ref,

      },
      callback:function(r){
        let options = []
        if (r.message) {
          options = r.message
        }
        if (options.length > 0) {
          frm.doc.work_order_date = options[0]
        } else {
          frm.doc.work_order_date = ''
        }
        frm.set_df_property("work_order_date", "options", options);
        frm.refresh_field('work_order_date')
        frm.refresh_field('item_ref')
      }
    })
  },

  set_table_html: function (frm) {
    if (!frm.doc.item_ref) {
      frappe.throw(__("Please Set Item Ref"));
    }
    if (!frm.doc.work_order_date && !frm.doc.batch_no) {
      frappe.throw(__("Please Set work Order Date or Batch No"));
    }
    frappe.call({
      method:
        "smart_manafacturing.smart_manafacturing.doctype.awesome_manufacturing.awesome_manufacturing.get_work_orders_by_ref",
      args: {
        item_ref: frm.doc.item_ref,
        work_order_date: frm.doc.work_order_date,
        batch_no:frm.doc.batch_no
      },
      freeze: true,
      callback: function (r) {
        let html =
          '<table class="table qty-table table-bordered" style="margin:0px; width: 100%">';

        if (r.message.x.length > 0 && r.message.y.length > 0) {
          frm.doc.xname = r.message.xname;
          frm.doc.yname = r.message.yname;
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
							  data-doctype="Work Order"
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
							  data-doctype="Work Order"
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
						<div class="control-input" >
						<input type="number"   value = '0'  class="input-with-feedback form-control y-total-${y}-controller" minlength="140"
						placeholder="total" 
						data-y=${y}
            title="${y} Qty"

						readonly
						>
						</div>
            <br/>
            <div class="control-input">
						<input  type="text"  value = '0'  class="input-with-feedback form-control y-total-${y}-controller-sf" minlength="140"
						placeholder="total" 
            title="Start / Finish Total Qty"
						data-y=${y}
						readonly
						>
						</div>
						</td>`;
          });
          html += `<th width = "10%">${__("Total")}</th>`;
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
							  data-doctype="Work Order"
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
            frm.doc.values[x] = {};
            r.message.y.forEach((y) => {
              let obj = r.message.result.find((i) => i.x == x && i.y == y) || {
                checked: false,
                x: x,
                y: y,
                has_finish: false,
                has_start: false,
              };

              frm.doc.values[x][y] = obj;

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
              let disabled = !obj.work_order ? "disabled" : "";
              let finish_disabled = !obj.has_finish ? "disabled" : "";
              let start_disabled = !obj.has_start ? "disabled" : "";
              let status_link = obj.link&&obj.status ? `<span class="ellipsis"> <a href="${obj.link}">${obj.status || ""}</a></span>` : ""
              html += `<td>

					  <div class="form-group frappe-control input-max-width" data-fieldtype="Check" data-fieldname="" title="${
              (obj.work_order || "")
              + (("\nManufactured Qty : " +  obj.produced_qty) || "")
            }">

		
					  <div class="checkbox">
						  <label class = "${(obj.status || "").toLowerCase()}" >
							  <span class="input-area" style="display: flex;">
							  <input type="checkbox"
							  class = "work-order-controller-${x} work-order-controller-${y} work-order-controller ${(
                obj.status || ""
              ).toLowerCase()} "
							   autocomplete="off"
							    class="input-with-feedback" 
							  data-fieldtype="Check" 
							  data-fieldname="${obj.work_order || ""}" 
							  placeholder="" 
							  data-doctype="Work Order"
							  data-x=${x}
							  data-y=${y}
							  data-work-order = ${obj.work_order || ""}																											r
							  data-item = ${obj.item_code} 
							  data-qty = ${obj.qty || 0} 
							  data-status = ${obj.status} 
							 
							 ${disabled}
							  ></span>
							  <span class="disp-area" style="display: none;"><input type="checkbox" disabled="" class="disabled-selected"></span>
							  <span class="label-area">${obj.qty || 0}</span>
							  <span>   &nbsp;&nbsp;&nbsp;&nbsp;
							  </span>	 
							  <span class="indicator-pill ${
                  (obj.status && frm.doc.styles[obj.status]) || ""
                } filterable ellipsis">
							
							  ${status_link}
                
								</span>
						  </label>
						  <p class="help-box small text-muted"></p>
					  </div>
                
				  </div>


				 
				  <div class = "section-body">
          
				  <div class = "form-column col-sm-6">
				  <div class="control-input ">
				  <input type="number" value = ${
            obj.start_qty || 0
          } class="input-with-feedback form-control start-qty-controller start-qty-controller-${x}-${y}" minlength="80"
				  placeholder="Start Qty" 
				  title="Start Qty" 
				  data-x=${x}
				  data-y=${y}
				  ${start_disabled}
				  >

				  
				  </div>
			</div>
			<div class = "form-column col-sm-6">

				  <div class="control-input">
				  <input type="number" value = ${
            obj.finish_qty || 0
          } class="input-with-feedback form-control finish-qty-controller finish-qty-controller-${x}-${y}" minlength="80"
							placeholder="Finished Qty" 
							title="Finished Qty" 
							data-x=${x}
							data-y=${y}
							${finish_disabled}
							>
				  </div>
				  </div>
				  </div>

						</td>`;
            });
            html += `<td >
					<div class="control-input">
					<input type="number" text = '0' value = '0' class="input-with-feedback form-control x-total-${x}-controller" minlength="140"
					placeholder="total" 
					data-x=${x}
          title="${x} Qty"
					readonly
					>
					</div>
          <br/>
          <div class="control-input">
          <input  type="text"  value = '0'  class="input-with-feedback form-control x-total-${x}-controller-sf" minlength="140"
          placeholder="total" 
          title="Start / Finish Total Qty"
          data-x=${x}
          readonly
          >
          </div>
					</td>`;

            html += "</tr>";
          });
          last_Row += `<td>
						<div class="control-input">
						<input type="number"   value = '0'  class="input-with-feedback form-control total-controller" minlength="140"
						placeholder="total" 
            title= "Total Qty"
						readonly
						>
            <br/>
            <div class="control-input">
						<input  type="text"  value = '0'  class="input-with-feedback form-control total-controller-sf" minlength="140"
						placeholder="total" 
            title="Start / Finish Total Qty"
						readonly
						>
						</div>
						</div>
						</td>`;
          last_Row += "</tr>";
          html += last_Row;
          html += "</tbody>";
        }
        html += "</table>";
        //debugger
        let f = frm.get_field("work_orders");
        // frm.get_field("qty_table").$wrapper.append(html)

        frm.refresh_field("work_orders");
        let $results = frm.get_field("work_orders").$wrapper.find(".results");
        $results.html("");
        $results.html(html);
        frm.events.set_totals(frm, $results);

        $results.on("change", ".select-all", function (e) {
          let checked = e.target.checked;
          $results.find(`.work-order-controller`).prop("checked", checked);
          frm.events.check_all(frm, $results, checked);
        });
        $results.on("change", ".check-x", function (e) {
          //debugger
          let x = e.target.dataset.x;
          let checked = e.target.checked;
          $results.find(`.work-order-controller-${x}`).prop("checked", checked);
          frm.events.check_axis(frm, $results, checked, "x", x);
        });

        $results.on("change", ".check-y", function (e) {
          let y = e.target.dataset.y;
          let checked = e.target.checked;
          $results.find(`.work-order-controller-${y}`).prop("checked", checked);
          frm.events.check_axis(frm, $results, checked, "y", y);
        });

        $results.on("change", ".work-order-controller", function (e) {
          let y = e.target.dataset.y;
          let x = e.target.dataset.x;
          let checked = e.target.checked;

          frm.doc.values[x][y].checked = checked;

          frm.events.check_selected(frm, $results);
        });
        $results.on("change", ".finish-qty-controller", function (e) {
          let y = e.target.dataset.y;
          let x = e.target.dataset.x;
          let value = e.target.value;

          frm.doc.values[x][y].finish_qty = parseInt(value,10);
          frm.events.set_totals(frm, $results);
          //frm.events.check_selected(frm, $results);
        });
        $results.on("change", ".start-qty-controller", function (e) {
          let y = e.target.dataset.y;
          let x = e.target.dataset.x;
          let value = e.target.value;
          frm.events.set_totals(frm, $results);
          frm.doc.values[x][y].start_qty = parseInt(value,10);
          //frm.events.check_selected(frm, $results);
        });
      },
    });
  },
  set_totals: function (frm, $results) {
    let flag = true;
    let totalxy = 0;

    let totalxy_s = 0;
    let totalxy_f = 0;
    $.each(frm.doc.values, function (x, xvalue) {
      let total = 0;
      let total_s = 0;
      let total_f = 0;
      // console.log(x, xvalue);
      $.each(xvalue, function (y, value) {
        let compy = $results.find(`.y-total-${y}-controller`);
        total += value.qty || 0;
        totalxy += value.qty || 0;

        let compy_sf = $results.find(`.y-total-${y}-controller-sf`);
        total_s += value.start_qty || 0;
        total_f += value.finish_qty || 0;
        totalxy_s += value.start_qty || 0;
        totalxy_f += value.finish_qty || 0;



        if (flag) {

          let ytotal = 0;

          let ytotal_s = 0;
          let ytotal_f = 0;
          $.each(frm.doc.values, function (xx, xxvalue) {
            ytotal += frm.doc.values[xx][y].qty || 0;
            ytotal_s += frm.doc.values[xx][y].start_qty || 0;
            ytotal_f += frm.doc.values[xx][y].finish_qty || 0;
          });
          compy.prop("value", ytotal);
          compy_sf.prop("value", `${ytotal_s} / ${ytotal_f}`);

        }
        //console.log(y, value);
      });
      flag = false;
      $results.find(`.x-total-${x}-controller`).prop("value", total);
      $results.find(`.x-total-${x}-controller-sf`).prop("value", `${total_s} / ${total_f}`);

    });
    $results.find(`.total-controller`).prop("value", totalxy);
    $results.find(`.total-controller-sf`).prop("value", `${totalxy_s.toString()} / ${totalxy_f.toString()}`);

  },
  /*set_totals_sf: function (frm, $results) {
    let flag_sf = true;
    $.each(frm.doc.values, function (x, xvalue) {
      let total_S = 0;
      let total_f = 0;

      // console.log(x, xvalue);
      $.each(xvalue, function (y, value) {
        let compy_sf = $results.find(`.y-total-${y}-controller-sf`);
        total_s += value.start_qty || 0;
        total_f += value.finish_qty || 0;
        totalxy_s += value.start_qty || 0;
        totalxy_f += value.finish_qty || 0;
        if (flag_sf) {
          let ytotal_s = 0;
          let ytotal_f = 0;
          $.each(frm.doc.values, function (xx, xxvalue) {
            ytotal_s += frm.doc.values[xx][y].start_qty || 0;
            ytotal_f += frm.doc.values[xx][y].finish_qty || 0;
          });
          compy_sf.prop("value", `${ytotal_s} / ${ytotal_f}`);
        }
        //console.log(y, value);
      });
      flag = false;
      $results.find(`.x-total-${x}-controller-sf`).prop("value", `${total_S} / ${total_f}`);
    });
    $results.find(`.total-controller-sf`).prop("value", `${totalxy_s} / ${totalxy_f}`);
  },*/
  check_all: function (frm, $results, checked) {
    $.each(frm.doc.values, function (x, x_value) {
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
    $.each(frm.doc.values, function (x, x_value) {
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
    $.each(frm.doc.values, function (x, x_value) {
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
    $.each(frm.doc.values, function (x, x_value) {
      $.each(x_value, function (y, obj) {
        if (obj.checked && obj.work_order) {
          selected.push(obj);
        }
      });
    });
    return selected;
  },
  submit: function (frm) {
    let selected = frm.events.get_selected(frm);
    frappe.call({
      method:
        "smart_manafacturing.smart_manafacturing.doctype.awesome_manufacturing.awesome_manufacturing.submit_all",
      args: {
        selected: selected, 
      },
      freeze: true,

      callback: function (r) {
        //frm.refresh()
        frm.events.get_work_order(frm);
      },
    });
  },
  start: function (frm) {
    let selected = frm.events.get_selected(frm);
    frappe.call({
      method:
        "smart_manafacturing.smart_manafacturing.doctype.awesome_manufacturing.awesome_manufacturing.start_all",
      args: {
        selected: selected,
      },
      freeze: true,
      callback: function (r) {
        //frm.refresh()
        frm.events.get_work_order(frm);
      },
    });
  },
  finish: function (frm) {
    let selected = frm.events.get_selected(frm);
    frappe.call({
      method:
        "smart_manafacturing.smart_manafacturing.doctype.awesome_manufacturing.awesome_manufacturing.finish_all",
      args: {
        selected: selected,
      },
      freeze: true,
      callback: function (r) {
        //frm.refresh()
        frm.events.get_work_order(frm);
      },
    });
  },
  update_batch_no: function (frm) {
    if (!frm.doc.batch_no){
      frappe.throw(__("Please Set Batch No"))
    }
    let selected = frm.events.get_selected(frm);
    frappe.call({
      method:
        "smart_manafacturing.smart_manafacturing.doctype.awesome_manufacturing.awesome_manufacturing.update_batch_no",
      args: {
        selected: selected,
        batch_no:frm.doc.batch_no
      },
      freeze: true,
      callback: function (r) {
        //frm.refresh()
        frm.events.get_work_order(frm);
      },
    });
  },


  
});
