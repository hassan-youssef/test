# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from erpnext.manufacturing.doctype.production_plan.production_plan import ProductionPlan
from . import __version__ as app_version

app_name = "smart_manafacturing"
app_title = "Smart Manafacturing"
app_publisher = "Peter Maged"
app_description = "Smart Manafacturing "
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "eng.peter.maged@gmail.com"
app_license = "MIT"

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/smart_manafacturing/css/smart_manafacturing.css"
# app_include_js = "/assets/smart_manafacturing/js/smart_manafacturing.js"

# include js, css files in header of web template
# web_include_css = "/assets/smart_manafacturing/css/smart_manafacturing.css"
# web_include_js = "/assets/smart_manafacturing/js/smart_manafacturing.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "smart_manafacturing/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }
doctype_js = {
    "Production Plan" : "smart_manafacturing/doctype/production_plan/production_plan.js"
    }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Installation
# ------------

# before_install = "smart_manafacturing.install.before_install"
# after_install = "smart_manafacturing.install.after_install"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "smart_manafacturing.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

override_doctype_class = {
 	"Job Card": "smart_manafacturing.smart_manafacturing.doctype.job_card.job_card.JobCard",
	"Production Plan":"smart_manafacturing.smart_manafacturing.doctype.production_plan.production_plan_override.ProductionPlan",
	"Stock Entry":"smart_manafacturing.smart_manafacturing.doctype.stock_entry.stock_entry.StockEntry"
}

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
#	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"smart_manafacturing.tasks.all"
# 	],
# 	"daily": [
# 		"smart_manafacturing.tasks.daily"
# 	],
# 	"hourly": [
# 		"smart_manafacturing.tasks.hourly"
# 	],
# 	"weekly": [
# 		"smart_manafacturing.tasks.weekly"
# 	]
# 	"monthly": [
# 		"smart_manafacturing.tasks.monthly"
# 	]
# }

# Testing
# -------

# before_tests = "smart_manafacturing.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"erpnext.manufacturing.doctype.production_plan.production_plan.ProductionPlan.get_items":
#      "smart_manafacturing.smart_manafacturing.doctype.production_plan.production_plan.ProductionPlan.get_items"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "smart_manafacturing.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]


# User Data Protection
# --------------------

user_data_fields = [
	{
		"doctype": "{doctype_1}",
		"filter_by": "{filter_by}",
		"redact_fields": ["{field_1}", "{field_2}"],
		"partial": 1,
	},
	{
		"doctype": "{doctype_2}",
		"filter_by": "{filter_by}",
		"partial": 1,
	},
	{
		"doctype": "{doctype_3}",
		"strict": False,
	},
	{
		"doctype": "{doctype_4}"
	}
]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"smart_manafacturing.auth.validate"
# ]

