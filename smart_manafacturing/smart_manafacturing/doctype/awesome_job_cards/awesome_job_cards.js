// Copyright (c) 2021, Peter Maged and contributors
// For license information, please see license.txt

frappe.ui.form.on("Awesome Job Cards", {
  // refresh: function(frm) {
  // }
  item_ref: function (frm) {
    frm.events.get_options(frm);
  },
  operation: function (frm) {
    frm.events.get_options(frm);
  },
  get_options: function (frm) {
    if (!frm.doc.item_ref || !frm.doc.operation) return;
    frappe.call({
      method:
        "smart_manafacturing.smart_manafacturing.doctype.awesome_job_cards.awesome_job_cards.get_available_dates",
      args: {
        item_ref: frm.doc.item_ref,
        operation: frm.doc.operation,
      },
      callback: function (r) {
        let options = [];
        if (r.message) {
          options = r.message;
        }
        if (options.length > 0) {
          frm.doc.job_card_date = options[0];
        } else {
          frm.doc.job_card_date = "";
        }
        frm.set_df_property("job_card_date", "options", options);
        frm.refresh_field("job_card_date");
        frm.refresh_field("item_ref");
      },
    });
  },
  onload(frm) {
    frappe.require([
      "assets/smart_manafacturing/css/awesome_manufacturing.css",
    ]);
    refresh_field("job_cards");
    frm.get_field("job_cards").$wrapper.html('<div class = "results"></div');
    frm.doc.styles = {
      Open: "red",
      "Material Transferred": "blue",
      "Work In Progress": "orange",
      Completed: "green",
      Cancelled: "red",
    };
    //    frm.get_field("qty_table").$wrapper.append('<div class = "results"></div')
  },
  get_job_cards(frm) {
    frm.doc.values = {};
    frm.events.set_table_html(frm);
  },

  set_table_html: function (frm) {
    if (!frm.doc.item_ref) {
      frappe.throw(__("Please Set Item Ref"));
    }
    if (!frm.doc.job_card_date) {
      frappe.throw(__("Please Set Job Card Date"));
    }

    if (!frm.doc.job_card_date) {
      frappe.throw(__("Please Set Operation Field"));
    }
    frappe.call({
      method:
        "smart_manafacturing.smart_manafacturing.doctype.awesome_job_cards.awesome_job_cards.get_job_cards_by_ref",
      args: {
        item_ref: frm.doc.item_ref,
        job_card_date: frm.doc.job_card_date,
        operation: frm.doc.operation,
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
          html += `<th>${__("Total")}</th>`;
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
              let disabled = !obj.job_card ? "disabled" : "";
              let start_disabled = !obj.has_start ? "disabled" : "";
              html += `<td>
  
						<div class="form-group frappe-control input-max-width" data-fieldtype="Check" data-fieldname="" title="${
              obj.job_card || ""
            } /  ${obj.employee_name || ""}">
  
		  
						<div class="checkbox">
							<label  >
								<span class="input-area" style="display: flex;">
								<input type="checkbox"
								class = "job-card-controller-${x} job-card-controller-${y} job-card-controller"
								 autocomplete="off"
								  class="input-with-feedback" 
								data-fieldtype="Check" 
								data-fieldname="${obj.job_card || ""}" 
								placeholder="" 
								data-doctype="Job Card"
								data-x=${x}
								data-y=${y}
								data-job-card = ${obj.job_card || ""}																											r
								data-item = ${obj.item_code} 
								data-qty = ${obj.for_quantity || 0} 
								data-status = ${obj.status} 
							   
							   ${disabled}
								></span>
								<span class="disp-area" style="display: none;"><input type="checkbox" disabled="" class="disabled-selected"></span>
								<span class="label-area">${obj.for_quantity || 0} / ${
                obj.total_completed_qty || 0
              }</span>
								<span>   &nbsp;&nbsp;&nbsp;&nbsp;
								</span>	 
								<span class="indicator-pill ${
                  (obj.status && frm.doc.styles[obj.status]) || ""
                } filterable ellipsis">
							  
								<span class="ellipsis"> ${ frm.events.getStatus(obj.status || "")}</span>
							  
								  </span>
							</label>
							<p class="help-box small text-muted"></p>
						</div>
			  
					</div>
  
  
				   
					<div class="control-input " style="width:50% !important;">
					<input type="number" value = ${
            obj.start_qty || 0
          } class="input-with-feedback form-control start-qty-controller start-qty-controller-${x}-${y}" 
			placeholder="Start Qty" 
			title="Start Qty" 
			label="Start Qty" 
					data-x=${x}
					data-y=${y}
					${start_disabled}
					>
			  
					</div>
  
						  </td>`;
            });
            html += `<td >
					  <div class="control-input" style="width:50% !important;">
					  <input type="number" text = '0' value = '0' class="input-with-feedback form-control x-total-${x}-controller" 
					  placeholder="total" 
					  data-x=${x}
					  readonly
					  >
					  </div>
					  </td>`;

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
          html += last_Row;
          html += "</tbody>";
        }
        html += "</table>";
        //debugger
        let f = frm.get_field("job_cards");
        // frm.get_field("qty_table").$wrapper.append(html)
        frm.refresh_field("job_cards");
        let $results = frm.get_field("job_cards").$wrapper.find(".results");
        $results.html("");
        $results.html(html);
        frm.events.set_totals(frm, $results);

        $results.on("change", ".select-all", function (e) {
          let checked = e.target.checked;
          $results.find(`.job-card-controller`).prop("checked", checked);
          frm.events.check_all(frm, $results, checked);
        });
        $results.on("change", ".check-x", function (e) {
          //debugger
          let x = e.target.dataset.x;
          let checked = e.target.checked;
          $results.find(`.job-card-controller-${x}`).prop("checked", checked);
          frm.events.check_axis(frm, $results, checked, "x", x);
        });

        $results.on("change", ".check-y", function (e) {
          let y = e.target.dataset.y;
          let checked = e.target.checked;
          $results.find(`.job-card-controller-${y}`).prop("checked", checked);
          frm.events.check_axis(frm, $results, checked, "y", y);
        });

        $results.on("change", ".job-card-controller", function (e) {
          let y = e.target.dataset.y;
          let x = e.target.dataset.x;
          let checked = e.target.checked;

          frm.doc.values[x][y].checked = checked;

          frm.events.check_selected(frm, $results);
        });
        /*$results.on("change", ".finish-qty-controller", function (e) {
			let y = e.target.dataset.y;
			let x = e.target.dataset.x;
			let value = e.target.value;
  
			frm.doc.values[x][y].finish_qty = value;
			//frm.events.check_selected(frm, $results);
		  });*/
        $results.on("change", ".start-qty-controller", function (e) {
          let y = e.target.dataset.y;
          let x = e.target.dataset.x;
          let value = e.target.value;

          frm.doc.values[x][y].start_qty = value;
          //frm.events.check_selected(frm, $results);
        });
      },
    });
  },
  set_totals: function (frm, $results) {
    let flag = true;
    let total_x_y = 0;
    $.each(frm.doc.values, function (x, x_value) {
      let total = 0;

      // console.log(x, xvalue);
      $.each(x_value, function (y, value) {
        let com_py = $results.find(`.y-total-${y}-controller`);
        total += value.for_quantity || 0;
        total_x_y += value.for_quantity || 0;
        if (flag) {
          let y_total = 0;
          $.each(frm.doc.values, function (xx, x_x_value) {
            y_total += frm.doc.values[xx][y].for_quantity || 0;
          });
          com_py.prop("value", y_total);
        }
        //console.log(y, value);
      });
      flag = false;
      $results.find(`.x-total-${x}-controller`).prop("value", total);
    });
    $results.find(`.total-controller`).prop("value", total_x_y);
  },

  getStatus(status){
    let arr = (status || "").toString().split(" ").map(x=>x.substring(0,1).toUpperCase())
    // console.log("arr => " , arr)
    return arr.join("")
  },
  
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
        if (obj.checked && obj.job_card) {
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
        "smart_manafacturing.smart_manafacturing.doctype.awesome_job_cards.awesome_job_cards.submit_all",
      args: {
        selected: selected,
      },
      freeze: true,

      callback: function (r) {
        //frm.refresh()
        frm.events.get_job_cards(frm);
      },
    });
  },
  start: function (frm) {
    if (!frm.doc.employee) {
      frappe.throw(__("Please Set Employee"));
    }
    if (!frm.doc.from_time) {
      frappe.throw(__("Please Set From Time"));
    }
    if (!frm.doc.to_time) {
      frappe.throw(__("Please Set To Time"));
    }
    let selected = frm.events.get_selected(frm);
    console.log(selected);
    frappe.call({
      method:
        "smart_manafacturing.smart_manafacturing.doctype.awesome_job_cards.awesome_job_cards.start_all",
      args: {
        selected: selected,
        employee: frm.doc.employee,
        from_time: frm.doc.from_time,
        to_time: frm.doc.to_time,
      },
      freeze: true,
      callback: function (r) {
        //frm.refresh()
        frm.events.get_job_cards(frm);
      },
    });
  },
  material_transfer: function (frm) {
    let selected = frm.events.get_selected(frm);
    frappe.call({
      method:
        "smart_manafacturing.smart_manafacturing.doctype.awesome_job_cards.awesome_job_cards.material_transfer_all",
      args: {
        selected: selected,
      },
      freeze: true,
      callback: function (r) {
        //frm.refresh()
        frm.events.get_job_cards(frm);
      },
    });
  },
});
