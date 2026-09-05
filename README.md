# DealFlow360 – Intelligent, Self-Governing Sales Operations Platform
### Built for **Gada Electronics**

DealFlow360 is an enterprise-grade B2B sales operations platform that governs the entire quotation-to-cash lifecycle for **Gada Electronics**, an omnichannel electronics distributor selling laptops, smartphones, commercial appliances, smart TVs, air conditioners, installation services, and recurring AMC maintenance plans.

Unlike a generic e-commerce cart or a basic CRM, DealFlow360 is a **self-governing sales operations engine**. The sales representative operates the system, but the platform itself mathematically enforces governance:
$$\text{Quotation Builder} \longrightarrow \text{Discount Governance} \longrightarrow \text{Approval Routing} \longrightarrow \text{Negotiation} \longrightarrow \text{Warehouse Splitting} \longrightarrow \text{Hybrid Billing} \longrightarrow \text{Razorpay Payment} \longrightarrow \text{Deal Health} \longrightarrow \text{Smart Follow-ups}$$

---

## 1. High-Level Architecture Diagram

```
[ Customer Portal ]    [ Sales Rep ]    [ Sales Manager ]    [ Finance / Ops ]    [ Admin ]
        │                    │                  │                     │               │
        └────────────────────┴──────────┬───────┴─────────────────────┴───────────────┘
                                        │
                                        ▼
                             [ React.js + Tailwind UI ]
                                        │ (REST API / JWT)
                                        ▼
                            [ Express.js API Gateway ]
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
                 [ Auth Middleware ]           [ RBAC Middleware ]
               (Supabase JWT / Demo)          (Strict Role Boundaries)
                         │
                         ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │                 CORE BUSINESS LOGIC ENGINES                     │
        ├────────────────────────────────┬────────────────────────────────┤
        │ • Discount Risk Engine         │ • Approval Routing Engine      │
        │ • Multi-Warehouse Splitting    │ • Hybrid Subscription Engine   │
        │ • Deal Health (0-100 Score)    │ • Smart Follow-up Automation   │
        │ • Customer Negotiation Engine  │ • Razorpay Payment Verifier    │
        └────────────────────────────────┴────────────────────────────────┘
                         │
                         ▼
                 [ MySQL 8.0 Database ]
       (37 Relational Tables • Transactions • SELECT ... FOR UPDATE)
```

---

## 2. Technology Stack

* **Frontend**: React.js 18, React Router v7, Tailwind CSS, Lucide Icons, Axios.
* **Backend**: Node.js, Express.js REST API with clean Controller/Service architecture.
* **Database**: MySQL 8.0 using `mysql2/promise` connection pools and database transactions (`withTransaction`, `SELECT ... FOR UPDATE`).
  * *Why MySQL?* Quotations, line items, multi-tier approvals, multi-warehouse allocations, subscriptions, invoices, and payments have strict relational dependencies and ACID transaction requirements.
* **Identity & Authentication**: Supabase Auth / Local JWT with role hydration from MySQL `users` table.
* **Payment Gateway**: Razorpay Test Mode with backend cryptographic HMAC-SHA256 signature verification.

---

## 3. User Personas & Role Boundaries

| Role | Persona | Permissions & Responsibilities |
| :--- | :--- | :--- |
| **ADMIN** | Jethalal Gada | Full catalog management, category ceilings, price lists, discount tiers, warehouses, users. |
| **SALES_REP** | Vaishnavi Shah | Creates quotations, selects products, applies discounts, requests approval, views pipeline & follow-ups. *Cannot approve own quotes.* |
| **SALES_MANAGER** | Natu Kaka | Reviews approval requests, approves/rejects/returns quotes with audit notes, monitors deal health. |
| **FINANCE_OPERATIONS** | Bagha Sundar | Handles 2nd-level approvals (>10% risk), accepts multi-warehouse stock splits, manages backorders, issues invoices, tracks subscriptions. |
| **CUSTOMER** | Taarak Mehta (*Metro Office*) | Dedicated customer portal (`/customer`), reviews assigned quotes, proposes line-level counter-discounts, confirms deals, pays via Razorpay. *Strict data isolation enforced.* |

---

## 4. Key Business Logic & Algorithms

### A. Blended Discount Risk Score
For every quotation line item:
$$\text{lineOverage} = \max(0, \text{actualDiscount} - \text{allowedDiscount})$$
$$\text{weightedRisk} = \frac{\sum (\text{lineOverage} \times \text{lineNetValue})}{\text{totalQuotationValue}}$$
* Ceilings are loaded from MySQL (`categories` and `discount_rules`):
  * Hardware: 15% ceiling | Services: 10% ceiling | Subscriptions/Warranties: 8% ceiling.
* Generates clear, transparent policy breach explanations (e.g. *"Installation Service exceeds category ceiling of 10.00% by 8.00%"*).

### B. Dynamic Approval Routing
* **0% – 5% Risk**: `NOT_REQUIRED` (Auto-approved).
* **5.01% – 10% Risk**: `PENDING_MANAGER` (Sales Manager review).
* **> 10% Risk**: `PENDING_FINANCE` (Sales Manager approval $\to$ Finance Operations sign-off).

### C. Multi-Warehouse Splitting & Allocation
* 3 Regional Warehouses: `Main Warehouse (Mumbai)`, `East Depot (Kolkata)`, `North Warehouse (Delhi)`.
* Smart Allocation Algorithm:
  * Computes stock across hubs to minimize total shipment count and freight cost.
  * For 5 units of Dell Inspiron 15 (Main: 3, East: 2), automatically proposes split: **Main Warehouse (3 units) + East Depot (2 units)** across 2 shipments.
  * Locks inventory using `SELECT ... FOR UPDATE` inside an isolated transaction.
  * If total stock is insufficient, creates a `backorders` record with automated consolidation upon restock.

### D. Customer Negotiation & Automated Re-Approval
* When a customer requests an aggressive discount (e.g. 18% counter-offer):
  * Backend recalculates the blended risk score.
  * If the counter-offer exceeds policy ceilings, the quotation **automatically re-enters the approval workflow** (`PENDING_MANAGER`).
  * Customer receives: *"Your requested terms are being reviewed by Gada Electronics management."*

### E. Deal Health Engine (0–100 Score)
* Base score = 100 with deduction factors:
  * Inactivity > 3 days: -15 pts | Inactivity > 7 days: -25 pts
  * Severe discount risk (>10%): -20 pts
  * Approval turnaround delay (>2 days): -10 pts
  * Delivery promise slippage: -20 pts
  * Repeated negotiations (>2 rounds): -10 pts
* Thresholds: `HEALTHY` (70–100), `AT_RISK` (40–69), `CRITICAL` (<40).

### F. Smart Follow-Up Engine (EVENT $\to$ RULE $\to$ ACTION)
* Automatically creates high-priority salesperson tasks when deals stall, when deal health drops below 50, or for high-value accounts (>₹500,000).

### G. Razorpay Test Mode Payment & Verification
* Generates Razorpay test order from invoice.
* Verifies payment signature server-side using HMAC SHA-256.
* Upon verification, transaction atomically transitions `invoices.payment_status = 'PAID'` and `quotations.status = 'PAID'`.

---

## 5. Quick Start Instructions

### Prerequisites
* **Node.js**: v18+ (tested on v22)
* **MySQL Server 8.0**: Running on `localhost:3306`

### Step 1: Clone & Configure Environment
In `c:\Dealflow_odoo\server\.env`:
```env
PORT=5000
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=dealflow360
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password
JWT_SECRET=dealflow360_super_secret_jwt_key_gada_electronics_2026
RAZORPAY_KEY_ID=rzp_test_mock_gada
RAZORPAY_KEY_SECRET=rzp_test_mock_secret
```

### Step 2: Initialize Database & Seed Gada Electronics Data
```powershell
npm run db:init
```
*Creates the `dealflow360` database, 37 relational tables, and populates 57 products across 13 categories, 8 customers, 3 warehouses, and sample quotations.*

### Step 3: Run the Application
In terminal 1 (Backend API):
```powershell
npm run server
```
In terminal 2 (React Frontend):
```powershell
npm run client
```
Open **http://localhost:5173** in your browser.

---

## 6. Demo Personas (1-Click Switcher Available in UI)

| Persona | Email | Password | Role |
| :--- | :--- | :--- | :--- |
| **Vaishnavi Shah** | `rep@gadaelectronics.com` | `password123` | SALES_REP |
| **Natu Kaka** | `manager@gadaelectronics.com` | `password123` | SALES_MANAGER |
| **Bagha Sundar** | `finance@gadaelectronics.com` | `password123` | FINANCE_OPERATIONS |
| **Taarak Mehta** | `customer@metrooffice.com` | `password123` | CUSTOMER (*Metro Office Systems*) |
| **Jethalal Gada** | `admin@gadaelectronics.com` | `password123` | ADMIN |

*Tip: A floating role switcher is available at the bottom-right corner of the application for quick switching.*

---

## 7. 5-Minute Golden Demo Walkthrough

1. **Step 1 (Sales Rep)**:
   - Login as **Vaishnavi Shah** (Sales Rep).
   - Open Quotation **Q-2026-1001** for *Metro Office Systems*.
   - View line items: 5× Dell Inspiron 15 (12% discount), 5× Laptop Installation Service (18% discount), 5× 2-Year Warranty (10% discount).
2. **Step 2 (Discount Governance Exception)**:
   - Notice the amber governance banner: *"Installation Service exceeds category discount ceiling by 8.00%; Extended Warranty exceeds category discount ceiling by 2.00%"*.
   - Notice the live Gross Margin Gauge (15.9%) and Blended Risk Score (8.5%).
3. **Step 3 (Live Upsell Attachment)**:
   - On the right panel, find **Logitech Wireless Mouse** (+₹645 margin).
   - Click **"+ Add to Quote"** $\to$ observe quotation total and margin update immediately.
4. **Step 4 (Submit for Governance Approval)**:
   - Click **"Submit Quotation"** $\to$ the platform self-governs and routes the quote to `PENDING_MANAGER`.
5. **Step 5 (Manager Approval)**:
   - Click the bottom-right Persona Switcher $\to$ switch to **Natu Kaka** (Sales Manager).
   - Go to **Approval Queue** (`/manager/approvals`) $\to$ click **"Approve"** with notes.
   - Status updates to `APPROVED`.
6. **Step 6 (Warehouse Splitting)**:
   - Switch to **Bagha Sundar** (Finance & Ops) $\to$ open **Warehouse Fulfillment** (`/finance/fulfillment`).
   - The algorithm evaluates Dell Inspiron 15 stock:
     * *Main Warehouse (Mumbai)*: 3 units
     * *East Depot (Kolkata)*: 2 units
     * *Estimated Shipments*: 2 Hubs
   - Click **"Accept Suggested Split & Fulfill"** $\to$ inventory is locked and reserved via database transactions.
7. **Step 7 (Customer Review & Negotiation)**:
   - Switch to **Taarak Mehta** (Customer Portal).
   - Open Quotation **Q-2026-1001** $\to$ click **"Propose Counter-Discount"**.
   - Request an 18% counter-offer $\to$ click **"Submit Counter Offer"**.
   - The platform recalculates risk and automatically shifts status back to `PENDING_MANAGER`.
8. **Step 8 (Confirmation & Razorpay Test Payment)**:
   - Click **"Confirm Quotation"**.
   - Click **"Pay Now (Razorpay Test Mode)"** $\to$ backend creates Razorpay order, verifies HMAC signature, and updates invoice to `PAID`!
9. **Step 9 (Deal Health & Smart Follow-ups)**:
   - Switch to Sales Manager $\to$ open **Deal Health & Anomalies** (`/manager/deals`).
   - View Deal Health score of stalled quotation Q-2026-1002 (Health 42/100, At-Risk).
   - View detected discount anomaly on LG OLED TV.
   - Go to **Smart Follow-ups** (`/sales/follow-ups`) $\to$ mark follow-up complete $\to$ audit log refreshed!
