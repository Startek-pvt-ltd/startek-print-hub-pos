-- The owner withdrew the dashboard display-reset feature after its original
-- development migration had been applied. Remove its unused persistence while
-- preserving immutable invoice, payment, report, and audit history.
DROP TABLE IF EXISTS "dashboard_sales_resets";
