/**
 * DealFlow360 - Bulk Seed Script
 * Generates 300+ realistic demo records to stress-test the system.
 * Run: node server/database/bulkSeed.js
 */
const mysql = require('mysql2/promise');
const path  = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
function daysAgo(n) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
function daysFromNow(n) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const PWD_HASH = '$2a$10$h6xbAY29BK3qcgxyTDQH5.wadRiUP4SPe3OmpsaD82OLIOhF/p3Ba';
const EXISTING_CUSTOMER_IDS = [1,2,3,4,5,6,7,8];
const EXISTING_REP_IDS      = [4, 5];
const MANAGER_ID            = 2;
const FINANCE_ID            = 3;
const SALES_TEAM_IDS        = [1, 2];
const COMPANY_ID            = 1;

const PRODUCTS = [
  {id:1,cat:1,sell:65000,cost:52000,type:'ONE_TIME',tax:18},{id:2,cat:1,sell:62000,cost:50000,type:'ONE_TIME',tax:18},
  {id:3,cat:1,sell:78000,cost:63000,type:'ONE_TIME',tax:18},{id:4,cat:1,sell:42000,cost:34000,type:'ONE_TIME',tax:18},
  {id:5,cat:1,sell:58000,cost:47000,type:'ONE_TIME',tax:18},{id:6,cat:1,sell:74000,cost:60000,type:'ONE_TIME',tax:18},
  {id:7,cat:2,sell:79999,cost:66000,type:'ONE_TIME',tax:18},{id:8,cat:2,sell:84900,cost:72000,type:'ONE_TIME',tax:18},
  {id:9,cat:2,sell:69999,cost:58000,type:'ONE_TIME',tax:18},{id:10,cat:2,sell:74999,cost:62000,type:'ONE_TIME',tax:18},
  {id:11,cat:2,sell:36999,cost:30000,type:'ONE_TIME',tax:18},{id:12,cat:2,sell:64999,cost:53000,type:'ONE_TIME',tax:18},
  {id:13,cat:3,sell:28500,cost:23000,type:'ONE_TIME',tax:18},{id:14,cat:3,sell:38900,cost:31000,type:'ONE_TIME',tax:18},
  {id:15,cat:3,sell:27200,cost:22000,type:'ONE_TIME',tax:18},{id:16,cat:3,sell:24500,cost:19500,type:'ONE_TIME',tax:18},
  {id:17,cat:4,sell:41000,cost:33000,type:'ONE_TIME',tax:18},{id:18,cat:4,sell:46500,cost:37500,type:'ONE_TIME',tax:18},
  {id:19,cat:4,sell:39900,cost:32000,type:'ONE_TIME',tax:18},{id:20,cat:4,sell:18900,cost:15000,type:'ONE_TIME',tax:18},
  {id:21,cat:5,sell:52990,cost:42000,type:'ONE_TIME',tax:18},{id:22,cat:5,sell:165000,cost:135000,type:'ONE_TIME',tax:18},
  {id:23,cat:5,sell:68900,cost:56000,type:'ONE_TIME',tax:18},{id:24,cat:5,sell:34999,cost:28000,type:'ONE_TIME',tax:18},
  {id:25,cat:6,sell:28990,cost:23000,type:'ONE_TIME',tax:18},{id:26,cat:6,sell:32490,cost:26000,type:'ONE_TIME',tax:18},
  {id:27,cat:6,sell:54900,cost:44000,type:'ONE_TIME',tax:18},{id:28,cat:7,sell:44990,cost:36000,type:'ONE_TIME',tax:18},
  {id:29,cat:7,sell:46990,cost:38000,type:'ONE_TIME',tax:18},{id:30,cat:7,sell:35990,cost:29000,type:'ONE_TIME',tax:18},
  {id:31,cat:7,sell:47500,cost:39000,type:'ONE_TIME',tax:18},{id:32,cat:8,sell:17490,cost:14000,type:'ONE_TIME',tax:18},
  {id:33,cat:8,sell:16990,cost:13500,type:'ONE_TIME',tax:18},{id:34,cat:9,sell:49900,cost:42000,type:'ONE_TIME',tax:18},
  {id:35,cat:9,sell:67999,cost:56000,type:'ONE_TIME',tax:18},{id:36,cat:9,sell:26999,cost:21500,type:'ONE_TIME',tax:18},
  {id:37,cat:10,sell:23500,cost:18500,type:'ONE_TIME',tax:18},{id:38,cat:10,sell:14200,cost:11000,type:'ONE_TIME',tax:18},
  {id:39,cat:10,sell:16800,cost:13200,type:'ONE_TIME',tax:18},{id:40,cat:11,sell:2495,cost:1600,type:'ONE_TIME',tax:18},
  {id:41,cat:11,sell:1295,cost:650,type:'ONE_TIME',tax:18},{id:42,cat:11,sell:3499,cost:1800,type:'ONE_TIME',tax:18},
  {id:43,cat:11,sell:899,cost:350,type:'ONE_TIME',tax:18},{id:44,cat:11,sell:2899,cost:1200,type:'ONE_TIME',tax:18},
  {id:45,cat:11,sell:5999,cost:3200,type:'ONE_TIME',tax:18},{id:46,cat:11,sell:1999,cost:850,type:'ONE_TIME',tax:18},
  {id:47,cat:11,sell:8499,cost:5800,type:'ONE_TIME',tax:18},{id:48,cat:12,sell:1999,cost:500,type:'SERVICE',tax:18},
  {id:49,cat:12,sell:1499,cost:400,type:'SERVICE',tax:18},{id:50,cat:12,sell:2499,cost:800,type:'SERVICE',tax:18},
  {id:51,cat:12,sell:1299,cost:350,type:'SERVICE',tax:18},{id:52,cat:12,sell:1799,cost:450,type:'SERVICE',tax:18},
  {id:53,cat:13,sell:4999,cost:1800,type:'SUBSCRIPTION',tax:18},{id:54,cat:13,sell:8999,cost:3200,type:'SUBSCRIPTION',tax:18},
  {id:55,cat:13,sell:3999,cost:1500,type:'SUBSCRIPTION',tax:18},{id:56,cat:13,sell:8999,cost:2500,type:'SUBSCRIPTION',tax:18},
  {id:57,cat:13,sell:24999,cost:7000,type:'SUBSCRIPTION',tax:18},
];

const CAT_CEIL  = {1:15,2:12,3:12,4:12,5:14,6:12,7:12,8:10,9:12,10:10,11:12,12:10,13:8};
const TIER_CEIL = {BRONZE:5,SILVER:10,GOLD:15};
const TIERS     = ['BRONZE','SILVER','GOLD'];

const STATUSES = ['DRAFT','SENT','UNDER_NEGOTIATION','PENDING_APPROVAL','APPROVED','FULFILLMENT','INVOICED','PAID','COMPLETED','REJECTED','CANCELLED'];
const APPR_MAP = {
  DRAFT:'NOT_REQUIRED',SENT:'NOT_REQUIRED',UNDER_NEGOTIATION:'NOT_REQUIRED',
  PENDING_APPROVAL:'PENDING_MANAGER',APPROVED:'APPROVED',FULFILLMENT:'APPROVED',
  INVOICED:'APPROVED',PAID:'APPROVED',COMPLETED:'APPROVED',REJECTED:'REJECTED',CANCELLED:'NOT_REQUIRED'
};

const CITIES = ['Mumbai','Delhi','Bengaluru','Chennai','Hyderabad','Pune','Ahmedabad','Kolkata','Jaipur','Surat'];
const COMPANIES = ['Alpha Tech Solutions','Beta Systems Pvt Ltd','Gamma Innovations','Delta Ventures',
  'Epsilon Technologies','Zeta Corp','Eta Industries','Theta Enterprises','Iota Services',
  'Kappa Business Solutions','Lambda Digital','Mu Retail Group','Nu Enterprise Corp',
  'Xi Technologies','Omicron Systems','Pi Solutions','Rho Ventures','Sigma Electronics',
  'Tau Corporate','Upsilon Digital','Phi Business Group','Chi Technologies','Psi Solutions',
  'Omega Industries','Nexus Corp','Vertex Technologies','Apex Business Solutions','Meridian Systems',
  'Zenith Enterprises','Quantum Solutions'];
const CONTACTS = ['Rajesh Kumar','Priya Sharma','Amit Patel','Sunita Nair','Rahul Gupta','Anita Singh',
  'Vikram Mehta','Kavita Rao','Suresh Iyer','Meena Krishnan','Anil Joshi','Pooja Desai',
  'Manoj Tiwari','Rekha Bhatia','Sanjay Chopra','Divya Malhotra','Ravi Verma','Shruti Pandey',
  'Deepak Agarwal','Neha Saxena','Prakash Reddy','Lakshmi Nair','Harish Mishra','Geeta Bhatt',
  'Sunil Yadav','Nirmala Sinha','Mohan Das','Pushpa Rajan','Girish Khatri','Savitha Murthy'];
const REPS = ['Arjun Kapoor','Neha Trivedi','Rajan Pillai','Swati Bose','Deepak Chaudhary',
  'Sneha Kulkarni','Manish Rawat','Preeti Ghosh','Vikas Chauhan','Ritu Srivastava',
  'Anand Nambiar','Kaveri Menon','Santosh Patil','Divya Prabhu','Girish Sharma'];
const FOLLOW_TITLES = ['Follow up on pending approval','Check delivery status','Request customer feedback',
  'Schedule product demo','Renewal reminder','Post-sale check-in','Upsell opportunity review',
  'Payment overdue contact','Send revised quotation','Confirm shipping address'];
const FOLLOW_REASONS = ['Deal health dropped below 60','Customer not responded for 3 days',
  'Approval pending more than 2 days','Invoice due in 7 days','Subscription renewal approaching',
  'High-value deal requires close monitoring','Customer requested demo session',
  'Competitor activity detected','Payment not received','Quote expiring in 2 days'];
const AUDIT_ACTIONS = ['QUOTE_CREATED','DISCOUNT_CHANGED','SUBMITTED_FOR_APPROVAL','APPROVAL_GRANTED',
  'STATUS_CHANGED','ITEM_ADDED','ITEM_REMOVED','FULFILLMENT_INITIATED','INVOICE_ISSUED','PAYMENT_RECEIVED'];
const NOTIF_TYPES = ['APPROVAL_REQUIRED','DEAL_AT_RISK','COUNTER_OFFER','BACKORDER_READY','PAYMENT_SUCCESS','FOLLOW_UP_DUE'];
const ANOMALY_TYPES = ['HIGH_DISCOUNT','UNUSUAL_VOLUME','PRICE_BELOW_COST','EXCESSIVE_NEGOTIATION'];
const ANOMALY_DESCS = ['Discount exceeds category ceiling by >5%','Order volume 3x customer average',
  'Line price below cost - negative margin','Customer requested 4+ revisions - stalled',
  'High-value discount without approval','Suspicious bulk order from new customer'];

async function main() {
  const conn = await mysql.createConnection({
    host:     process.env.MYSQL_HOST     || 'localhost',
    port:     parseInt(process.env.MYSQL_PORT || '3306'),
    user:     process.env.MYSQL_USER     || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'dealflow360',
  });
  console.log('Connected to dealflow360');

  try {
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    await conn.query('SET SESSION sql_mode = ""');

    // 1. 30 Customers
    console.log('Inserting 30 customers...');
    const custIds = [...EXISTING_CUSTOMER_IDS];
    for (let i = 0; i < 30; i++) {
      const tier  = pick(TIERS);
      const city  = pick(CITIES);
      const limit = tier==='GOLD'?rand(1500000,5000000):tier==='SILVER'?rand(600000,1200000):rand(200000,500000);
      const [r] = await conn.query(
        'INSERT INTO customers (company_id,company_name,contact_person,email,phone,billing_address,shipping_address,customer_tier,credit_limit,active) VALUES (?,?,?,?,?,?,?,?,?,TRUE)',
        [COMPANY_ID,COMPANIES[i],CONTACTS[i],
         `bulk${i+1}@${COMPANIES[i].toLowerCase().replace(/\s+/g,'').slice(0,15)}.com`,
         `+91 98${rand(100,999)} ${rand(10000,99999)}`,
         `${rand(1,500)} ${city} Business Park, ${city}`,
         `WH-${rand(1,10)}, ${city} Logistics Park`,
         tier, limit]
      );
      custIds.push(r.insertId);
    }
    console.log(`  ${custIds.length} total customers`);

    // 2. 15 Sales Reps
    console.log('Inserting 15 sales reps...');
    const repIds = [...EXISTING_REP_IDS];
    for (let i = 0; i < 15; i++) {
      const [r] = await conn.query(
        'INSERT INTO users (company_id,name,email,password_hash,role,sales_team_id,active) VALUES (?,?,?,?,?,?,TRUE)',
        [COMPANY_ID, REPS[i], `bulkrep${i+1}@gadaelectronics.com`, PWD_HASH, 'SALES_REP', pick(SALES_TEAM_IDS)]
      );
      repIds.push(r.insertId);
    }
    for (let i = 8; i < custIds.length; i++) {
      await conn.query('UPDATE customers SET assigned_salesperson_id=? WHERE id=?',[pick(repIds),custIds[i]]);
    }
    console.log(`  ${repIds.length} total reps`);

    // 3. Full inventory coverage
    console.log('Filling inventory...');
    for (const p of PRODUCTS) {
      for (const wh of [1,2,3]) {
        const qty = (p.type==='SERVICE'||p.type==='SUBSCRIPTION') ? 999 : rand(5,100);
        await conn.query(
          'INSERT INTO inventory (product_id,warehouse_id,available_quantity,reserved_quantity,reorder_level) VALUES (?,?,?,0,5) ON DUPLICATE KEY UPDATE available_quantity=available_quantity+?',
          [p.id,wh,qty,qty]
        );
      }
    }
    console.log('  Inventory done');

    // 4. 150 Quotations
    console.log('Inserting 150 quotations...');
    const allQuotes = [];
    for (let q = 0; q < 150; q++) {
      const custId = pick(custIds);
      const repId  = pick(repIds);
      const status = pick(STATUSES);
      const approvalStatus = APPR_MAP[status] || 'NOT_REQUIRED';
      const tier   = pick(TIERS);
      const tierCeil = TIER_CEIL[tier];
      const lineProds = shuffle(PRODUCTS).slice(0, rand(2,5));
      const daysBack = rand(0, 120);

      let subtotal=0, totalDisc=0, totalTax=0, totalCost=0;
      const lines = [];

      for (const p of lineProds) {
        const qty = rand(1,20);
        const catCeil = CAT_CEIL[p.cat]||10;
        const allowed = Math.min(tierCeil,catCeil);
        const discPct = parseFloat((Math.random()<0.3 ? allowed+rand(1,5) : rand(0,allowed)).toFixed(2));
        const overage = parseFloat(Math.max(0, discPct-allowed).toFixed(2));
        const lineRisk = overage>0 ? parseFloat((overage*1.5).toFixed(2)) : 0;
        const discAmt  = parseFloat((p.sell*qty*discPct/100).toFixed(2));
        const net      = p.sell*qty - discAmt;
        const taxAmt   = parseFloat((net*p.tax/100).toFixed(2));
        const lineTotal= parseFloat((net+taxAmt).toFixed(2));
        const billing  = p.type==='SUBSCRIPTION' ? pick(['MONTHLY','QUARTERLY','YEARLY']) : 'ONE_TIME';
        subtotal+=p.sell*qty; totalDisc+=discAmt; totalTax+=taxAmt; totalCost+=p.cost*qty;
        lines.push({p,qty,discPct,discAmt,taxAmt,lineTotal,allowed,overage,lineRisk,billing});
      }

      const totalAmount = parseFloat((subtotal-totalDisc+totalTax).toFixed(2));
      const marginAmt   = parseFloat((totalAmount/1.18-totalCost).toFixed(2));
      const marginPct   = totalAmount>0 ? parseFloat((marginAmt/(totalAmount/1.18)*100).toFixed(2)) : 0;
      const riskScore   = parseFloat(Math.min(lines.reduce((a,l)=>a+l.lineRisk,0),99).toFixed(2));
      const riskLevel   = riskScore<5?'LOW':riskScore<10?'MEDIUM':riskScore<20?'HIGH':'CRITICAL';
      const createdAt   = daysAgo(daysBack);

      const [qr] = await conn.query(
        `INSERT INTO quotations (quotation_number,customer_id,salesperson_id,status,approval_status,
          subtotal,total_discount,tax_amount,total_amount,total_cost,margin_amount,margin_pct,
          risk_score,risk_level,risk_reason,currency,valid_until,notes,created_at,last_activity_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,'INR',?,?,?,?)`,
        [`Q-BULK-${2000+q}`,custId,repId,status,approvalStatus,
         subtotal,totalDisc,totalTax,totalAmount,totalCost,marginAmt,marginPct,
         riskScore,riskLevel,riskScore>0?`Blended risk ${riskScore}%`:null,
         daysFromNow(rand(7,30)),`Bulk test quotation #${q+1}`,createdAt,daysAgo(rand(0,daysBack))]
      );
      const qId = qr.insertId;
      allQuotes.push({id:qId,status,approvalStatus,custId,repId,riskScore,totalAmount,createdAt});

      for (const line of lines) {
        await conn.query(
          `INSERT INTO quotation_items (quotation_id,product_id,item_type,quantity,unit_price,cost_price,
            discount_pct,discount_amount,tax_pct,tax_amount,line_total,
            allowed_discount_pct,discount_overage_pct,line_risk_score,billing_interval)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [qId,line.p.id,line.p.type,line.qty,line.p.sell,line.p.cost,
           line.discPct,line.discAmt,line.p.tax,line.taxAmt,line.lineTotal,
           line.allowed,line.overage,line.lineRisk,line.billing]
        );
      }

      await conn.query(
        'INSERT INTO quotation_status_history (quotation_id,old_status,new_status,changed_by,notes,created_at) VALUES (?,?,?,?,?,?)',
        [qId,'DRAFT',status,repId,'Bulk demo data',createdAt]
      );

      if (q % 30 === 0) console.log(`  ... ${q} quotations inserted`);
    }
    console.log(`  150 quotations done`);

    // 5. Approval Requests
    console.log('Inserting approval requests...');
    for (const q of allQuotes.filter(q=>q.status==='PENDING_APPROVAL')) {
      const [ar] = await conn.query(
        `INSERT INTO approval_requests (quotation_id,requested_by,level,status,assigned_to,risk_score,risk_summary,created_at)
         VALUES (?,?,'MANAGER','PENDING',?,?,?,?)`,
        [q.id,q.repId,MANAGER_ID,q.riskScore,`Risk ${q.riskScore}% — manager review needed`,q.createdAt]
      );
      await conn.query(
        `INSERT INTO approval_history (approval_request_id,quotation_id,action_by,action,comments,previous_status,new_status,created_at)
         VALUES (?,?,?,'SUBMIT','Auto-trigger: discount overage','DRAFT','PENDING_APPROVAL',?)`,
        [ar.insertId,q.id,q.repId,q.createdAt]
      );
    }
    for (const q of allQuotes.filter(q=>['APPROVED','INVOICED','PAID','COMPLETED'].includes(q.status)).slice(0,40)) {
      const [ar] = await conn.query(
        `INSERT INTO approval_requests (quotation_id,requested_by,level,status,assigned_to,risk_score,risk_summary,resolved_at,created_at)
         VALUES (?,?,'MANAGER','APPROVED',?,?,?,NOW(),?)`,
        [q.id,q.repId,MANAGER_ID,q.riskScore,'Approved after review',q.createdAt]
      );
      await conn.query(
        `INSERT INTO approval_history (approval_request_id,quotation_id,action_by,action,comments,previous_status,new_status,created_at)
         VALUES (?,?,?,'APPROVE','Reviewed and approved','PENDING_APPROVAL','APPROVED',?)`,
        [ar.insertId,q.id,MANAGER_ID,daysAgo(rand(1,5))]
      );
    }
    console.log('  Approvals done');

    // 6. 80 Subscriptions + billing schedules
    console.log('Inserting 80 subscriptions...');
    const planIds=[1,2,3,4,5];
    const planAmts={1:999,2:2699,3:8999,4:3999,5:24999};
    const subQ = allQuotes.filter(q=>['APPROVED','INVOICED','PAID','COMPLETED'].includes(q.status)).slice(0,80);
    for (const q of subQ) {
      const planId = pick(planIds);
      const interval = pick(['MONTHLY','QUARTERLY','YEARLY']);
      const amt = planAmts[planId];
      const start = daysFromNow(-rand(30,365));
      const [sr] = await conn.query(
        `INSERT INTO subscriptions (quotation_id,customer_id,plan_id,status,billing_interval,recurring_amount,start_date,current_period_start,current_period_end,next_billing_date)
         VALUES (?,?,?,'ACTIVE',?,?,?,?,?,?)`,
        [q.id,q.custId,planId,interval,amt,start,start,daysFromNow(rand(1,90)),daysFromNow(rand(15,90))]
      );
      for (let b=0; b<3; b++) {
        await conn.query(
          `INSERT INTO subscription_billing_schedule (subscription_id,quotation_id,billing_date,amount,status)
           VALUES (?,?,?,?,?)`,
          [sr.insertId,q.id,daysFromNow(b*30-60),amt,b===0?'PAID':b===1?'BILLED':'SCHEDULED']
        );
      }
    }
    console.log('  Subscriptions done');

    // 7. 60 Invoices + Payments
    console.log('Inserting 60 invoices and payments...');
    const invQ = allQuotes.filter(q=>['INVOICED','PAID','COMPLETED'].includes(q.status)).slice(0,60);
    for (let i=0; i<invQ.length; i++) {
      const q = invQ[i];
      const payStatus = pick(['UNPAID','PARTIALLY_PAID','PAID','PAID','PAID']);
      const taxAmt = parseFloat((q.totalAmount*0.18/1.18).toFixed(2));
      const sub    = parseFloat((q.totalAmount-taxAmt).toFixed(2));
      const [ir] = await conn.query(
        `INSERT INTO invoices (invoice_number,quotation_id,customer_id,subtotal,discount_amount,tax_amount,total_amount,due_amount,payment_status,invoice_status,due_date,issued_at)
         VALUES (?,?,?,?,0,?,?,?,'UNPAID','ISSUED',?,NOW())`,
        [`INV-BULK-${3000+i}`,q.id,q.custId,sub,taxAmt,q.totalAmount,q.totalAmount,daysFromNow(rand(-30,30))]
      );
      await conn.query(
        `INSERT INTO invoice_items (invoice_id,description,quantity,unit_price,discount_amount,tax_amount,total_amount,item_type)
         VALUES (?,?,1,?,0,?,?,'ONE_TIME')`,
        [ir.insertId,`Items for quotation ${q.id}`,sub,taxAmt,q.totalAmount]
      );
      if (payStatus==='PAID') {
        await conn.query(
          `INSERT INTO payments (payment_number,invoice_id,quotation_id,customer_id,amount,payment_method,gateway,status,verified_at)
           VALUES (?,?,?,?,?,'BANK_TRANSFER','BANK_TRANSFER','SUCCESS',NOW())`,
          [`PAY-BULK-${3000+i}`,ir.insertId,q.id,q.custId,q.totalAmount]
        );
        await conn.query('UPDATE invoices SET payment_status=?,due_amount=0 WHERE id=?',['PAID',ir.insertId]);
      }
    }
    console.log('  Invoices and payments done');

    // 8. 100 Deal Health Records
    console.log('Inserting 100 deal health records...');
    for (const q of allQuotes.slice(0,100)) {
      const inact=rand(0,30), disc=rand(0,25), app=rand(0,15), del=rand(0,10), neg=rand(0,10);
      const score=Math.max(0,100-inact-disc-app-del-neg);
      const hs=score>=70?'HEALTHY':score>=40?'AT_RISK':'CRITICAL';
      await conn.query(
        `INSERT INTO deal_health (quotation_id,health_score,status,inactivity_deduction,discount_risk_deduction,approval_delay_deduction,delivery_slippage_deduction,negotiation_deduction,explanation)
         VALUES (?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE health_score=?,status=?`,
        [q.id,score,hs,inact,disc,app,del,neg,`Score ${score}/100. Auto-generated bulk record.`,score,hs]
      );
    }
    console.log('  Deal health done');

    // 9. 50 Negotiations + Comments
    console.log('Inserting 50 negotiations...');
    const sentQ = allQuotes.filter(q=>['SENT','UNDER_NEGOTIATION'].includes(q.status)).slice(0,50);
    for (const q of sentQ) {
      const reqD = parseFloat((rand(5,20)+Math.random()).toFixed(2));
      const counter = parseFloat((q.totalAmount*(1-reqD/100)).toFixed(2));
      const ns = pick(['OPEN','OPEN','ACCEPTED','REJECTED']);
      const [nr] = await conn.query(
        `INSERT INTO negotiations (quotation_id,customer_id,salesperson_id,status,requested_discount_pct,previous_total,counter_total,notes)
         VALUES (?,?,?,?,?,?,?,?)`,
        [q.id,q.custId,q.repId,ns,reqD,q.totalAmount,counter,`Customer requesting ${reqD}% discount`]
      );
      await conn.query(
        `INSERT INTO negotiation_comments (negotiation_id,quotation_id,user_id,author_role,comment_text,proposed_discount_pct)
         VALUES (?,?,?,?,?,?)`,
        [nr.insertId,q.id,q.custId,'CUSTOMER',`Can you do ${reqD}% off on this order?`,reqD]
      );
      await conn.query(
        `INSERT INTO negotiation_comments (negotiation_id,quotation_id,user_id,author_role,comment_text,proposed_discount_pct)
         VALUES (?,?,?,?,?,?)`,
        [nr.insertId,q.id,q.repId,'SALES_REP',`Best offer: ${Math.min(reqD,10).toFixed(2)}% — checking further.`,Math.min(reqD,10)]
      );
    }
    console.log('  Negotiations done');

    // 10. 80 Follow-ups
    console.log('Inserting 80 follow-ups...');
    for (let f=0; f<80; f++) {
      const q = pick(allQuotes);
      await conn.query(
        `INSERT INTO follow_ups (quotation_id,customer_id,salesperson_id,title,reason,priority,due_date,status)
         VALUES (?,?,?,?,?,?,?,?)`,
        [q.id,q.custId,pick(repIds),pick(FOLLOW_TITLES),pick(FOLLOW_REASONS),
         pick(['LOW','MEDIUM','HIGH','URGENT']),daysFromNow(rand(-2,14)),
         pick(['PENDING','PENDING','IN_PROGRESS','COMPLETED'])]
      );
    }
    console.log('  Follow-ups done');

    // 11. 100 Notifications
    console.log('Inserting 100 notifications...');
    const allUsers=[1,2,3,...repIds];
    for (let n=0; n<100; n++) {
      const q=pick(allQuotes);
      await conn.query(
        `INSERT INTO notifications (user_id,title,message,type,link_url,is_read,created_at)
         VALUES (?,?,?,?,?,?,?)`,
        [pick(allUsers),
         `${pick(NOTIF_TYPES).replace(/_/g,' ')}: Quote #${q.id}`,
         `Action required on Q-BULK-${2000+n} for customer ${q.custId}`,
         pick(NOTIF_TYPES),`/sales/quotations/${q.id}`,
         Math.random()<0.4,daysAgo(rand(0,30))]
      );
    }
    console.log('  Notifications done');

    // 12. 200 Audit Logs
    console.log('Inserting 200 audit logs...');
    const ROLES=['SALES_REP','SALES_MANAGER','FINANCE_OPERATIONS','ADMIN'];
    for (let a=0; a<200; a++) {
      const q=pick(allQuotes);
      await conn.query(
        `INSERT INTO audit_logs (quotation_id,user_id,user_role,action,old_value,new_value,reason,ip_address,created_at)
         VALUES (?,?,?,?,?,?,?,?,?)`,
        [q.id,pick([...repIds,MANAGER_ID,FINANCE_ID]),pick(ROLES),pick(AUDIT_ACTIONS),
         pick(['DRAFT','SENT']),pick(['APPROVED','INVOICED']),
         `Bulk test audit event`,`192.168.${rand(1,10)}.${rand(1,254)}`,daysAgo(rand(0,90))]
      );
    }
    console.log('  Audit logs done');

    // 13. 40 Anomalies
    console.log('Inserting 40 anomalies...');
    for (let an=0; an<40; an++) {
      const q=pick(allQuotes);
      await conn.query(
        `INSERT INTO anomalies (quotation_id,salesperson_id,anomaly_type,description,severity,resolved,created_at)
         VALUES (?,?,?,?,?,?,?)`,
        [q.id,pick(repIds),pick(ANOMALY_TYPES),pick(ANOMALY_DESCS),
         pick(['LOW','MEDIUM','HIGH']),Math.random()<0.3,daysAgo(rand(0,60))]
      );
    }
    console.log('  Anomalies done');

    // Summary
    console.log('\n=== Final Database Summary ===');
    for (const t of ['customers','users','quotations','quotation_items','invoices','payments',
                      'subscriptions','subscription_billing_schedule','deal_health',
                      'negotiations','follow_ups','notifications','audit_logs','anomalies','inventory','anomalies']) {
      try {
        const [[r]] = await conn.query(`SELECT COUNT(*) AS cnt FROM ${t}`);
        console.log(`  ${t.padEnd(35)} ${r.cnt} rows`);
      } catch(e) { /* skip */ }
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\nBulk seed complete! 300+ records inserted.\n');
  } catch(err) {
    console.error('Error:', err.message, err.code);
    await conn.query('SET FOREIGN_KEY_CHECKS = 1').catch(()=>{});
  } finally {
    await conn.end();
  }
}

main();
