-- ==============================================================================
-- DealFlow360 Database Schema (Gada Electronics)
-- Comprehensive Enterprise B2B Sales Operations Platform
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS dealflow360;
USE dealflow360;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Companies (Multi-tenant foundation)
DROP TABLE IF EXISTS companies;
CREATE TABLE companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  legal_name VARCHAR(200) NOT NULL,
  gstin VARCHAR(20),
  pan VARCHAR(20),
  currency VARCHAR(10) DEFAULT 'INR',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Sales Teams
DROP TABLE IF EXISTS sales_teams;
CREATE TABLE sales_teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  manager_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Customers
DROP TABLE IF EXISTS customers;
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  company_name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  phone VARCHAR(25) NOT NULL,
  billing_address TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  customer_tier ENUM('BRONZE', 'SILVER', 'GOLD') NOT NULL DEFAULT 'BRONZE',
  assigned_salesperson_id INT NULL,
  credit_limit DECIMAL(12,2) DEFAULT 500000.00,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_customer_tier (customer_tier),
  INDEX idx_customer_email (email)
) ENGINE=InnoDB;

-- 4. Users
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('ADMIN', 'SALES_REP', 'SALES_MANAGER', 'FINANCE_OPERATIONS', 'CUSTOMER') NOT NULL,
  sales_team_id INT NULL,
  customer_id INT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (sales_team_id) REFERENCES sales_teams(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  INDEX idx_user_role (role),
  INDEX idx_user_email (email)
) ENGINE=InnoDB;

-- Add foreign key from sales_teams to users for manager_id
ALTER TABLE sales_teams ADD CONSTRAINT fk_sales_teams_manager FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE customers ADD CONSTRAINT fk_customers_salesperson FOREIGN KEY (assigned_salesperson_id) REFERENCES users(id) ON DELETE SET NULL;

-- 5. Product Categories
DROP TABLE IF EXISTS categories;
CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  discount_ceiling_pct DECIMAL(5,2) DEFAULT 10.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 6. Products
DROP TABLE IF EXISTS products;
CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sku VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  category_id INT NOT NULL,
  description TEXT,
  selling_price DECIMAL(12,2) NOT NULL,
  cost_price DECIMAL(12,2) NOT NULL,
  tax_percentage DECIMAL(5,2) DEFAULT 18.00,
  unit VARCHAR(30) DEFAULT 'Unit',
  image_url VARCHAR(500),
  active BOOLEAN DEFAULT TRUE,
  product_type ENUM('ONE_TIME', 'SERVICE', 'SUBSCRIPTION') NOT NULL DEFAULT 'ONE_TIME',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_product_category (category_id),
  INDEX idx_product_type (product_type)
) ENGINE=InnoDB;

-- 7. Product Variants
DROP TABLE IF EXISTS product_variants;
CREATE TABLE product_variants (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  variant_name VARCHAR(100) NOT NULL,
  attribute_type VARCHAR(50) NOT NULL, -- RAM, Storage, Screen Size, Capacity
  attribute_value VARCHAR(100) NOT NULL,
  price_delta DECIMAL(12,2) DEFAULT 0.00,
  sku VARCHAR(80) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Price Lists
DROP TABLE IF EXISTS price_lists;
CREATE TABLE price_lists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  currency VARCHAR(10) DEFAULT 'INR',
  customer_tier ENUM('BRONZE', 'SILVER', 'GOLD') NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 9. Price List Items
DROP TABLE IF EXISTS price_list_items;
CREATE TABLE price_list_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  price_list_id INT NOT NULL,
  product_id INT NOT NULL,
  special_price DECIMAL(12,2) NULL,
  discount_pct DECIMAL(5,2) DEFAULT 0.00,
  FOREIGN KEY (price_list_id) REFERENCES price_lists(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uq_price_list_product (price_list_id, product_id)
) ENGINE=InnoDB;

-- 10. Discount Rules (Governance Engine)
DROP TABLE IF EXISTS discount_rules;
CREATE TABLE discount_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rule_type ENUM('TIER', 'CATEGORY', 'PRODUCT') NOT NULL,
  target_id INT NULL, -- category_id or product_id if applicable
  target_tier ENUM('BRONZE', 'SILVER', 'GOLD') NULL,
  max_discount_pct DECIMAL(5,2) NOT NULL,
  description VARCHAR(255),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 11. Approval Rules (Governance Engine)
DROP TABLE IF EXISTS approval_rules;
CREATE TABLE approval_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  min_risk_pct DECIMAL(5,2) NOT NULL,
  max_risk_pct DECIMAL(5,2) NOT NULL,
  required_level ENUM('NOT_REQUIRED', 'MANAGER', 'MANAGER_FINANCE') NOT NULL,
  description VARCHAR(255),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 12. Quotations (Core Deal Record)
DROP TABLE IF EXISTS quotations;
CREATE TABLE quotations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id INT NOT NULL,
  salesperson_id INT NOT NULL,
  status ENUM(
    'DRAFT', 'SENT', 'UNDER_NEGOTIATION', 'PENDING_APPROVAL', 'APPROVED',
    'FULFILLMENT', 'INVOICED', 'PAID', 'COMPLETED', 'REJECTED',
    'RETURNED_FOR_REVISION', 'CANCELLED'
  ) NOT NULL DEFAULT 'DRAFT',
  approval_status ENUM(
    'NOT_REQUIRED', 'PENDING_MANAGER', 'MANAGER_APPROVED',
    'PENDING_FINANCE', 'APPROVED', 'REJECTED', 'RETURNED_FOR_REVISION'
  ) NOT NULL DEFAULT 'NOT_REQUIRED',
  subtotal DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_discount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  total_cost DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  margin_amount DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  margin_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  risk_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  risk_level ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'LOW',
  risk_reason TEXT,
  currency VARCHAR(10) DEFAULT 'INR',
  valid_until DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_quotation_status (status),
  INDEX idx_quotation_customer (customer_id),
  INDEX idx_quotation_salesperson (salesperson_id),
  INDEX idx_quotation_activity (last_activity_at)
) ENGINE=InnoDB;

-- 13. Quotation Items
DROP TABLE IF EXISTS quotation_items;
CREATE TABLE quotation_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT NULL,
  item_type ENUM('ONE_TIME', 'SERVICE', 'SUBSCRIPTION') NOT NULL DEFAULT 'ONE_TIME',
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  cost_price DECIMAL(12,2) NOT NULL,
  discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_pct DECIMAL(5,2) NOT NULL DEFAULT 18.00,
  tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  allowed_discount_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  discount_overage_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  line_risk_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  billing_interval ENUM('ONE_TIME', 'MONTHLY', 'QUARTERLY', 'YEARLY') DEFAULT 'ONE_TIME',
  customer_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
  INDEX idx_quote_item_quote (quotation_id)
) ENGINE=InnoDB;

-- 14. Quotation Status History
DROP TABLE IF EXISTS quotation_status_history;
CREATE TABLE quotation_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  old_status VARCHAR(50),
  new_status VARCHAR(50) NOT NULL,
  changed_by INT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 15. Approval Requests
DROP TABLE IF EXISTS approval_requests;
CREATE TABLE approval_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  requested_by INT NOT NULL,
  level ENUM('MANAGER', 'FINANCE') NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'RETURNED') DEFAULT 'PENDING',
  assigned_to INT NULL,
  risk_score DECIMAL(5,2) NOT NULL,
  risk_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE RESTRICT,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_approval_status (status)
) ENGINE=InnoDB;

-- 16. Approval History
DROP TABLE IF EXISTS approval_history;
CREATE TABLE approval_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  approval_request_id INT NOT NULL,
  quotation_id INT NOT NULL,
  action_by INT NOT NULL,
  action ENUM('SUBMIT', 'APPROVE', 'REJECT', 'RETURN') NOT NULL,
  comments TEXT,
  previous_status VARCHAR(50),
  new_status VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (approval_request_id) REFERENCES approval_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (action_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 17. Warehouses
DROP TABLE IF EXISTS warehouses;
CREATE TABLE warehouses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  location VARCHAR(150) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 500.00,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 18. Inventory
DROP TABLE IF EXISTS inventory;
CREATE TABLE inventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  available_quantity INT NOT NULL DEFAULT 0,
  reserved_quantity INT NOT NULL DEFAULT 0,
  reorder_level INT NOT NULL DEFAULT 5,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  UNIQUE KEY uq_product_warehouse (product_id, warehouse_id)
) ENGINE=InnoDB;

-- 19. Inventory Reservations
DROP TABLE IF EXISTS inventory_reservations;
CREATE TABLE inventory_reservations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  product_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  quantity INT NOT NULL,
  status ENUM('RESERVED', 'FULFILLED', 'RELEASED') DEFAULT 'RESERVED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 20. Fulfillment Orders
DROP TABLE IF EXISTS fulfillment_orders;
CREATE TABLE fulfillment_orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fulfillment_number VARCHAR(50) NOT NULL UNIQUE,
  quotation_id INT NOT NULL,
  customer_id INT NOT NULL,
  status ENUM('PENDING', 'PARTIAL', 'ALLOCATED', 'DISPATCHED', 'DELIVERED') DEFAULT 'PENDING',
  total_shipments INT DEFAULT 1,
  estimated_shipping_cost DECIMAL(10,2) DEFAULT 0.00,
  expected_delivery_date DATE,
  actual_delivery_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 21. Fulfillment Items (Warehouse Splits)
DROP TABLE IF EXISTS fulfillment_items;
CREATE TABLE fulfillment_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fulfillment_order_id INT NOT NULL,
  quotation_item_id INT NOT NULL,
  product_id INT NOT NULL,
  warehouse_id INT NOT NULL,
  quantity INT NOT NULL,
  shipment_batch INT DEFAULT 1,
  status ENUM('ALLOCATED', 'PACKED', 'SHIPPED', 'DELIVERED') DEFAULT 'ALLOCATED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (fulfillment_order_id) REFERENCES fulfillment_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (quotation_item_id) REFERENCES quotation_items(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 22. Backorders
DROP TABLE IF EXISTS backorders;
CREATE TABLE backorders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity_needed INT NOT NULL,
  quantity_allocated INT NOT NULL DEFAULT 0,
  status ENUM('PENDING', 'PARTIALLY_FULFILLED', 'RESOLVED') DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP NULL,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 23. Subscription Plans
DROP TABLE IF EXISTS subscription_plans;
CREATE TABLE subscription_plans (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  plan_name VARCHAR(100) NOT NULL,
  billing_interval ENUM('MONTHLY', 'QUARTERLY', 'YEARLY') NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  cancellation_rule VARCHAR(255) DEFAULT 'Standard 30-day notice',
  refund_rule VARCHAR(255) DEFAULT 'Prorated refund within 14 days',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 24. Subscriptions
DROP TABLE IF EXISTS subscriptions;
CREATE TABLE subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  customer_id INT NOT NULL,
  plan_id INT NOT NULL,
  status ENUM('ACTIVE', 'PAUSED', 'CANCELLED', 'UPGRADED') DEFAULT 'ACTIVE',
  billing_interval ENUM('MONTHLY', 'QUARTERLY', 'YEARLY') NOT NULL,
  recurring_amount DECIMAL(12,2) NOT NULL,
  start_date DATE NOT NULL,
  current_period_start DATE NOT NULL,
  current_period_end DATE NOT NULL,
  next_billing_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 25. Subscription Billing Schedule
DROP TABLE IF EXISTS subscription_billing_schedule;
CREATE TABLE subscription_billing_schedule (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subscription_id INT NOT NULL,
  quotation_id INT NOT NULL,
  billing_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status ENUM('SCHEDULED', 'BILLED', 'PAID', 'CANCELLED') DEFAULT 'SCHEDULED',
  invoice_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 26. Billing Adjustments (Proration)
DROP TABLE IF EXISTS billing_adjustments;
CREATE TABLE billing_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  subscription_id INT NOT NULL,
  customer_id INT NOT NULL,
  adjustment_type ENUM('PRORATION_CREDIT', 'PRORATION_DEBIT', 'DISCOUNT_CREDIT', 'REFUND') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  reason TEXT NOT NULL,
  applied_to_invoice_id INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 27. Invoices
DROP TABLE IF EXISTS invoices;
CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  quotation_id INT NOT NULL,
  customer_id INT NOT NULL,
  subtotal DECIMAL(14,2) NOT NULL,
  discount_amount DECIMAL(14,2) DEFAULT 0.00,
  tax_amount DECIMAL(14,2) NOT NULL,
  total_amount DECIMAL(14,2) NOT NULL,
  due_amount DECIMAL(14,2) NOT NULL,
  payment_status ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'REFUNDED') DEFAULT 'UNPAID',
  invoice_status ENUM('DRAFT', 'ISSUED', 'CANCELLED') DEFAULT 'ISSUED',
  due_date DATE NOT NULL,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  INDEX idx_invoice_payment_status (payment_status)
) ENGINE=InnoDB;

-- 28. Invoice Items
DROP TABLE IF EXISTS invoice_items;
CREATE TABLE invoice_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id INT NOT NULL,
  quotation_item_id INT NULL,
  description VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0.00,
  tax_amount DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  item_type VARCHAR(50) DEFAULT 'ONE_TIME',
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  FOREIGN KEY (quotation_item_id) REFERENCES quotation_items(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 29. Payments (Razorpay Integration)
DROP TABLE IF EXISTS payments;
CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  payment_number VARCHAR(50) NOT NULL UNIQUE,
  invoice_id INT NOT NULL,
  quotation_id INT NOT NULL,
  customer_id INT NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'RAZORPAY',
  gateway ENUM('RAZORPAY', 'BANK_TRANSFER', 'CASH') DEFAULT 'RAZORPAY',
  gateway_order_id VARCHAR(100),
  gateway_payment_id VARCHAR(100),
  gateway_signature VARCHAR(255),
  status ENUM('PENDING', 'SUCCESS', 'FAILED') DEFAULT 'PENDING',
  error_reason TEXT,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  INDEX idx_payment_status (status),
  INDEX idx_gateway_order (gateway_order_id)
) ENGINE=InnoDB;

-- 30. Upsell & Cross-Sell Rules
DROP TABLE IF EXISTS upsell_rules;
CREATE TABLE upsell_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trigger_product_id INT NOT NULL,
  recommended_product_id INT NOT NULL,
  recommendation_type ENUM('UPSELL', 'CROSS_SELL', 'ATTACHMENT', 'SERVICE') NOT NULL,
  reason VARCHAR(255) NOT NULL,
  margin_delta DECIMAL(12,2) DEFAULT 0.00,
  is_promoted BOOLEAN DEFAULT FALSE,
  promo_tag VARCHAR(50),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trigger_product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (recommended_product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 31. Deal Health
DROP TABLE IF EXISTS deal_health;
CREATE TABLE deal_health (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL UNIQUE,
  health_score INT NOT NULL DEFAULT 100,
  status ENUM('HEALTHY', 'AT_RISK', 'CRITICAL') NOT NULL DEFAULT 'HEALTHY',
  inactivity_deduction INT DEFAULT 0,
  discount_risk_deduction INT DEFAULT 0,
  approval_delay_deduction INT DEFAULT 0,
  delivery_slippage_deduction INT DEFAULT 0,
  negotiation_deduction INT DEFAULT 0,
  explanation TEXT,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 32. Anomalies
DROP TABLE IF EXISTS anomalies;
CREATE TABLE anomalies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  salesperson_id INT NOT NULL,
  anomaly_type ENUM('HIGH_DISCOUNT', 'UNUSUAL_VOLUME', 'PRICE_BELOW_COST', 'EXCESSIVE_NEGOTIATION') NOT NULL,
  description TEXT NOT NULL,
  severity ENUM('LOW', 'MEDIUM', 'HIGH') NOT NULL DEFAULT 'MEDIUM',
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 33. Notifications
DROP TABLE IF EXISTS notifications;
CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('APPROVAL_REQUIRED', 'DEAL_AT_RISK', 'COUNTER_OFFER', 'BACKORDER_READY', 'PAYMENT_SUCCESS', 'FOLLOW_UP_DUE') NOT NULL,
  link_url VARCHAR(255),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notif_user_read (user_id, is_read)
) ENGINE=InnoDB;

-- 34. Smart Follow-ups (EVENT -> RULE -> ACTION)
DROP TABLE IF EXISTS follow_ups;
CREATE TABLE follow_ups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  customer_id INT NOT NULL,
  salesperson_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  reason TEXT NOT NULL,
  priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') DEFAULT 'MEDIUM',
  due_date DATE NOT NULL,
  status ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED') DEFAULT 'PENDING',
  action_taken TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_followup_status (status),
  INDEX idx_followup_due (due_date)
) ENGINE=InnoDB;

-- 35. Negotiations
DROP TABLE IF EXISTS negotiations;
CREATE TABLE negotiations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  customer_id INT NOT NULL,
  salesperson_id INT NOT NULL,
  status ENUM('OPEN', 'ACCEPTED', 'REJECTED', 'SUPERSEDED') DEFAULT 'OPEN',
  requested_discount_pct DECIMAL(5,2) DEFAULT 0.00,
  previous_total DECIMAL(14,2) NOT NULL,
  counter_total DECIMAL(14,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (salesperson_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 36. Negotiation Comments
DROP TABLE IF EXISTS negotiation_comments;
CREATE TABLE negotiation_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  negotiation_id INT NOT NULL,
  quotation_id INT NOT NULL,
  quotation_item_id INT NULL,
  user_id INT NOT NULL,
  author_role VARCHAR(50) NOT NULL,
  comment_text TEXT NOT NULL,
  proposed_discount_pct DECIMAL(5,2) NULL,
  proposed_quantity INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (negotiation_id) REFERENCES negotiations(id) ON DELETE CASCADE,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (quotation_item_id) REFERENCES quotation_items(id) ON DELETE SET NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 37. Audit Logs
DROP TABLE IF EXISTS audit_logs;
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NULL,
  user_id INT NULL,
  user_role VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_quote (quotation_id),
  INDEX idx_audit_action (action)
) ENGINE=InnoDB;

-- 38. Carts
DROP TABLE IF EXISTS carts;
CREATE TABLE carts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  customer_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  UNIQUE KEY uq_user_cart (user_id)
) ENGINE=InnoDB;

-- 39. Cart Items
DROP TABLE IF EXISTS cart_items;
CREATE TABLE cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cart_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT NULL,
  quantity INT NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 40. Quotation Versions
DROP TABLE IF EXISTS quotation_versions;
CREATE TABLE quotation_versions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quotation_id INT NOT NULL,
  version_number INT NOT NULL,
  total_discount DECIMAL(14,2) NOT NULL,
  subtotal DECIMAL(14,2) NOT NULL,
  tax_amount DECIMAL(14,2) NOT NULL,
  total_amount DECIMAL(14,2) NOT NULL,
  status VARCHAR(50) NOT NULL,
  changed_by VARCHAR(100) NOT NULL,
  change_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
  INDEX idx_quote_version (quotation_id, version_number)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;

