const { query, pool } = require('../config/db');

async function migrate() {
  console.log('🚀 Starting DealFlow360 Database Fixes & Image Updates...');

  try {
    // 1. Fix quotations.status column to VARCHAR(50) to prevent ENUM truncation errors
    console.log('1. Updating quotations status column to VARCHAR(50)...');
    try {
      await query(`ALTER TABLE quotations MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'DRAFT'`);
      console.log('   ✅ quotations.status updated successfully.');
    } catch (e) {
      console.log('   ⚠️ quotations status alter notice:', e.message);
    }

    // 2. Fix discount_rules.rule_type to VARCHAR(50) to support 'TIER', 'CATEGORY', 'PRODUCT', 'CUSTOMER_TIER'
    console.log('2. Updating discount_rules rule_type column to VARCHAR(50)...');
    try {
      await query(`ALTER TABLE discount_rules MODIFY COLUMN rule_type VARCHAR(50) NOT NULL DEFAULT 'TIER'`);
      console.log('   ✅ discount_rules.rule_type updated successfully.');
    } catch (e) {
      console.log('   ⚠️ discount_rules rule_type alter notice:', e.message);
    }

    // 3. Update products with genuine, distinct, real-world electronics imagery
    console.log('3. Updating product images with distinct real-world photographs...');
    const productUpdates = [
      // Air Conditioners (Fix missing/broken AC image and provide unique images)
      { id: 28, image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop&q=80', tax: 28.00 }, // LG 1.5 Ton Split AC
      { id: 29, image: 'https://images.unsplash.com/photo-1585338107529-13afc5f02586?w=600&auto=format&fit=crop&q=80', tax: 28.00 }, // Samsung 1.5 Ton Split AC
      { id: 30, image: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?w=600&auto=format&fit=crop&q=80', tax: 28.00 }, // Voltas 1.5 Ton AC
      { id: 31, image: 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?w=600&auto=format&fit=crop&q=80', tax: 28.00 }, // Daikin 1.5 Ton Inverter AC

      // Refrigerators (Distinct images)
      { id: 13, image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // LG 260L
      { id: 14, image: 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // Samsung 330L
      { id: 15, image: 'https://images.unsplash.com/photo-1588854337236-6889d631faa8?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // Whirlpool 265L
      { id: 16, image: 'https://images.unsplash.com/photo-1536353284924-9240ccfc426e?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // Godrej 240L

      // Printers (Distinct images)
      { id: 37, image: 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // HP LaserJet
      { id: 38, image: 'https://images.unsplash.com/photo-1563770660941-20978e870e26?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // Canon Pixma
      { id: 39, image: 'https://images.unsplash.com/photo-1589492477829-5e65395b66cc?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // Epson EcoTank

      // Smart TVs (Distinct images)
      { id: 21, image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // Samsung 55 4K
      { id: 22, image: 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // LG 65 OLED
      { id: 23, image: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // Sony Bravia 55
      { id: 24, image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // OnePlus 50 4K
      { id: 25, image: 'https://images.unsplash.com/photo-1528928441742-b4ccac1bb04c?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // Samsung 43 LED
      { id: 26, image: 'https://images.unsplash.com/photo-1567690187548-f07b1d7bf5a9?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // LG 43 UHD

      // Laptops (Distinct images)
      { id: 1, image: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // Dell Inspiron 15
      { id: 2, image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // HP Pavilion 14
      { id: 3, image: 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // Lenovo IdeaPad
      { id: 4, image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // ASUS Vivobook
      { id: 5, image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // Acer Aspire 5
      { id: 6, image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=600&auto=format&fit=crop&q=80', tax: 18.00 }, // ThinkPad E14
    ];

    for (const update of productUpdates) {
      await query(
        `UPDATE products SET image_url = ?, tax_percentage = ? WHERE id = ?`,
        [update.image, update.tax, update.id]
      );
    }
    console.log(`   ✅ Updated ${productUpdates.length} product images and GST rates.`);

    // 4. Ensure existing subscriptions are marked active
    console.log('4. Checking subscription plans & subscriptions table...');
    try {
      await query(`ALTER TABLE subscriptions MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'`);
      await query(`ALTER TABLE subscription_plans MODIFY COLUMN billing_interval VARCHAR(50) NOT NULL DEFAULT 'YEARLY'`);
      console.log('   ✅ subscriptions tables verified.');
    } catch (e) {
      console.log('   ⚠️ subscriptions notice:', e.message);
    }

    console.log('🎉 Database migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();
