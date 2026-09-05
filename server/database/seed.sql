-- ==============================================================================
-- DealFlow360 Seed Data (Gada Electronics)
-- ==============================================================================

USE dealflow360;

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Company
TRUNCATE TABLE companies;
INSERT INTO companies (id, name, legal_name, gstin, pan, currency) VALUES
(1, 'Gada Electronics', 'Gada Electronics Private Limited', '27AABCG1234F1Z5', 'AABCG1234F', 'INR');

-- 2. Sales Teams
TRUNCATE TABLE sales_teams;
INSERT INTO sales_teams (id, company_id, name) VALUES
(1, 1, 'Enterprise West Sales Team'),
(2, 1, 'National Corporate Accounts');

-- 3. Customers
TRUNCATE TABLE customers;
INSERT INTO customers (id, company_id, company_name, contact_person, email, phone, billing_address, shipping_address, customer_tier, credit_limit, active) VALUES
(1, 1, 'Metro Office Systems', 'Krish', 'customer@metrooffice.com', '+91 98200 12345', '702 Gokuldham Complex, Powder Gali, Goregaon East, Mumbai 400063', 'Warehouse 4, Gokuldham Logistics Park, Goregaon East, Mumbai 400063', 'GOLD', 1500000.00, TRUE),
(2, 1, 'TechWorld Solutions', 'Aatmaram Bhide', 'contact@techworld.com', '+91 98200 23456', 'A-Wing, Society Office, Goregaon East, Mumbai 400063', 'B-12 Technopark, Andheri East, Mumbai 400069', 'SILVER', 1000000.00, TRUE),
(3, 1, 'Reliance Digital B2B', 'Mukesh Bhatt', 'b2b@reliancedigital.com', '+91 98111 34567', 'Reliance Corporate Park, Thane-Belapur Road, Navi Mumbai 400701', 'Logistics Hub 3, Bhiwandi, Thane 421302', 'GOLD', 5000000.00, TRUE),
(4, 1, 'Sunrise Enterprises', 'Popatlal Pandey', 'procure@sunriseent.com', '+91 98333 45678', 'Times of India Press Road, Fort, Mumbai 400001', 'Plot 18, MIDC Tarapur, Palghar 401506', 'BRONZE', 300000.00, TRUE),
(5, 1, 'Apex Corporate Services', 'Dr. Hansraj Hathi', 'admin@apexcorp.in', '+91 98444 56789', '4th Floor, Hathi Healthcare Tower, Dadar West, Mumbai 400028', 'Dadar West Supply Office, Mumbai 400028', 'SILVER', 800000.00, TRUE),
(6, 1, 'SmartHome Dealers', 'Sundarlal Topiwala', 'sundar@smarthomedealers.com', '+91 98555 67890', 'Gada & Bros Commercial Arcade, Station Road, Ahmedabad 380001', 'Ring Road Depot, Sanand, Ahmedabad 382110', 'BRONZE', 400000.00, TRUE),
(7, 1, 'BluePeak Technologies', 'Krishnan Iyer', 'iyer@bluepeaktech.com', '+91 98666 78901', 'ISRO Space Center Road, Viman Nagar, Bengaluru 560037', 'Whitefield Industrial Area, Bengaluru 560066', 'SILVER', 900000.00, TRUE),
(8, 1, 'Nova Retail Group', 'Roshan Sodhi', 'sodhi@novaretail.com', '+91 98777 89012', 'Sodhi Garage & Logistics, Chembur, Mumbai 400071', 'Bhiwandi Central Godown, Thane 421302', 'GOLD', 2500000.00, TRUE);

-- 4. Users (Password for all seeded accounts is 'password123')
-- Hash: $2a$10$h6xbAY29BK3qcgxyTDQH5.wadRiUP4SPe3OmpsaD82OLIOhF/p3Ba
TRUNCATE TABLE users;
INSERT INTO users (id, company_id, name, email, password_hash, role, sales_team_id, customer_id, active) VALUES
(1, 1, 'Jethalal Gada', 'admin@gadaelectronics.com', '$2a$10$h6xbAY29BK3qcgxyTDQH5.wadRiUP4SPe3OmpsaD82OLIOhF/p3Ba', 'ADMIN', 1, NULL, TRUE),
(2, 1, 'Natu Kaka', 'manager@gadaelectronics.com', '$2a$10$h6xbAY29BK3qcgxyTDQH5.wadRiUP4SPe3OmpsaD82OLIOhF/p3Ba', 'SALES_MANAGER', 1, NULL, TRUE),
(3, 1, 'Chandar', 'finance@gadaelectronics.com', '$2a$10$h6xbAY29BK3qcgxyTDQH5.wadRiUP4SPe3OmpsaD82OLIOhF/p3Ba', 'FINANCE_OPERATIONS', 1, NULL, TRUE),
(4, 1, 'Bhagaha', 'rep@gadaelectronics.com', '$2a$10$h6xbAY29BK3qcgxyTDQH5.wadRiUP4SPe3OmpsaD82OLIOhF/p3Ba', 'SALES_REP', 1, NULL, TRUE),
(5, 1, 'Magan Lal', 'sales2@gadaelectronics.com', '$2a$10$h6xbAY29BK3qcgxyTDQH5.wadRiUP4SPe3OmpsaD82OLIOhF/p3Ba', 'SALES_REP', 2, NULL, TRUE),
(6, 1, 'Krish', 'customer@metrooffice.com', '$2a$10$h6xbAY29BK3qcgxyTDQH5.wadRiUP4SPe3OmpsaD82OLIOhF/p3Ba', 'CUSTOMER', NULL, 1, TRUE),
(7, 1, 'Aatmaram Bhide', 'contact@techworld.com', '$2a$10$h6xbAY29BK3qcgxyTDQH5.wadRiUP4SPe3OmpsaD82OLIOhF/p3Ba', 'CUSTOMER', NULL, 2, TRUE);

-- Update relations
UPDATE sales_teams SET manager_id = 2 WHERE id IN (1, 2);
UPDATE customers SET assigned_salesperson_id = 4 WHERE id IN (1, 2, 3, 5, 8);
UPDATE customers SET assigned_salesperson_id = 5 WHERE id IN (4, 6, 7);

-- 5. Categories
TRUNCATE TABLE categories;
INSERT INTO categories (id, name, code, description, discount_ceiling_pct) VALUES
(1, 'Laptops', 'LAPTOP', 'Commercial and enterprise grade notebooks and workstations', 15.00),
(2, 'Smartphones', 'PHONE', 'Flagship and enterprise fleet 5G mobile devices', 12.00),
(3, 'Refrigerators', 'FRIDGE', 'Frost-free, double door and commercial cooling appliances', 12.00),
(4, 'Washing Machines', 'WM', 'Front load, top load inverter washing machines', 12.00),
(5, 'Smart TVs', 'SMART_TV', '4K UHD, OLED and QLED large display panels for boardrooms & lounges', 14.00),
(6, 'LED/LCD TVs', 'LED_TV', 'High-definition hospitality and signage displays', 12.00),
(7, 'Air Conditioners', 'AC', 'Split and inverter air conditioners with high energy efficiency', 12.00),
(8, 'Microwave Ovens', 'MICROWAVE', 'Convection and grill commercial grade microwaves', 10.00),
(9, 'Tablets', 'TABLET', 'Productivity tablets and digital signature pads', 12.00),
(10, 'Printers', 'PRINTER', 'LaserJet, Tank and multifunction office printers', 10.00),
(11, 'Accessories', 'ACC', 'Keyboards, mice, docks, high-speed cables and peripherals', 12.00),
(12, 'Services', 'SERVICE', 'Onsite installation, configuration, mounting & data transfer', 10.00),
(13, 'Extended Warranty & AMC', 'WARRANTY', 'Annual Maintenance Contracts and 1-2 Year extended coverage plans', 8.00);

-- 6. Products (Realistic seeded electronics catalog)
TRUNCATE TABLE products;
INSERT INTO products (id, sku, name, category_id, description, selling_price, cost_price, tax_percentage, unit, image_url, active, product_type) VALUES
-- Laptops
(1, 'LAP-DELL-INSP15', 'Dell Inspiron 15', 1, 'Intel Core i5 13th Gen, 16GB RAM, 512GB NVMe SSD, 15.6" FHD Anti-Glare Display', 65000.00, 52000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(2, 'LAP-HP-PAV14', 'HP Pavilion 14', 1, 'AMD Ryzen 7 7730U, 16GB DDR4, 512GB SSD, 14" IPS FHD Micro-edge display', 62000.00, 50000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(3, 'LAP-LEN-SLIM5', 'Lenovo IdeaPad Slim 5', 1, 'Intel Core i7 13620H, 16GB LPDDR5, 1TB SSD, 16" WUXGA OLED', 78000.00, 63000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(4, 'LAP-ASUS-VIVO15', 'ASUS Vivobook 15', 1, 'Intel Core i3 12th Gen, 8GB RAM, 512GB SSD, Thin & Light Design', 42000.00, 34000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(5, 'LAP-ACER-ASP5', 'Acer Aspire 5', 1, 'Intel Core i5 13th Gen, 16GB RAM, 512GB SSD, RTX 2050 4GB GPU', 58000.00, 47000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(6, 'LAP-LEN-THINK14', 'Lenovo ThinkPad E14', 1, 'Military Grade Durability, Intel Core i5 vPro, 16GB RAM, 512GB SSD', 74000.00, 60000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),

-- Smartphones
(7, 'PHN-SAM-S25', 'Samsung Galaxy S25', 2, 'Snapdragon 8 Elite, 12GB RAM, 256GB Storage, Dynamic AMOLED 2X, AI Suite', 79999.00, 66000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(8, 'PHN-APL-IPH16', 'Apple iPhone 16', 2, 'A18 Bionic Chip, 128GB, Camera Control, 48MP Fusion Camera, Aerospace Aluminum', 84900.00, 72000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(9, 'PHN-OP-13', 'OnePlus 13', 2, 'Snapdragon 8 Elite, 16GB RAM, 512GB, Hasselblad Camera, 6000mAh Glacier Battery', 69999.00, 58000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(10, 'PHN-GOOG-PIX9', 'Google Pixel 9', 2, 'Google Tensor G4, 12GB RAM, 128GB, Advanced Gemini AI Built-in, Actua Display', 74999.00, 62000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(11, 'PHN-SAM-A56', 'Samsung Galaxy A56', 2, 'Exynos 1580, 8GB RAM, 128GB Storage, Super AMOLED 120Hz, IP67 Water Resistant', 36999.00, 30000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(12, 'PHN-XIA-15', 'Xiaomi 15', 2, 'Compact Flagship, Leica Summilux Optics, Snapdragon 8 Elite, 12GB+256GB', 64999.00, 53000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1580910051074-3eb694886505?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),

-- Refrigerators
(13, 'REF-LG-260L', 'LG 260L Double Door Refrigerator', 3, 'Smart Inverter Compressor, Multi Air Flow, 3 Star Energy Rating, Shiny Steel', 28500.00, 23000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(14, 'REF-SAM-330L', 'Samsung 330L Convertible Refrigerator', 3, '5-in-1 Convertible Modes, Twin Cooling Plus, Digital Inverter, Elegant Inox', 38900.00, 31000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(15, 'REF-WHR-265L', 'Whirlpool 265L Frost Free Refrigerator', 3, '6th Sense DeepFreeze Technology, Intellisense Inverter, Crystal Black Finish', 27200.00, 22000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(16, 'REF-GOD-240L', 'Godrej 240L Refrigerator', 3, 'Advanced Inverter Technology, Farm Fresh Crisper, Metallic Silver', 24500.00, 19500.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),

-- Washing Machines
(17, 'WM-LG-8KG', 'LG 8KG Front Load Washing Machine', 4, 'AI Direct Drive, 6 Motion DD, Steam Wash, Allergy Care, Middle Black', 41000.00, 33000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(18, 'WM-SAM-9KG', 'Samsung 9KG Front Load', 4, 'EcoBubble Technology, AI Control, Hygiene Steam, Digital Inverter, Inox Grey', 46500.00, 37500.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(19, 'WM-IFB-8KG', 'IFB 8KG Front Load', 4, 'Aqua Energie, 4D Wash System, Cradle Wash for Delicates, Silver', 39900.00, 32000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(20, 'WM-WHR-7KG', 'Whirlpool 7KG Top Load', 4, 'Spiro Wash Action, 12 Wash Programs, Hard Water Wash, Grey', 18900.00, 15000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),

-- Smart TVs
(21, 'TV-SAM-55-4K', 'Samsung 55" 4K Smart TV', 5, 'Crystal UHD 4K, HDR10+, Dynamic Crystal Color, AirSlim Design, SolarCell Remote', 52990.00, 42000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(22, 'TV-LG-65-OLED', 'LG 65" OLED Smart TV', 5, 'Self-lit OLED Pixels, alpha9 Gen6 AI Processor 4K, Dolby Vision & Atmos, 120Hz', 165000.00, 135000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(23, 'TV-SONY-55-4K', 'Sony Bravia 55" 4K', 5, 'X1 4K HDR Processor, 4K X-Reality PRO, Motionflow XR 200, Google TV UI', 68900.00, 56000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(24, 'TV-OP-50-4K', 'OnePlus 50" 4K Smart TV', 5, 'Gamma Engine, 1 Billion Colors, Dolby Audio 24W Output, Bezel-less Screen', 34999.00, 28000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),

-- LED/LCD TVs
(25, 'TV-SAM-43-LED', 'Samsung 43" LED TV', 6, 'Full HD LED Screen, HyperReal Engine, Wide Color Enhancer, Dual HDMI', 28990.00, 23000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(26, 'TV-LG-43-UHD', 'LG 43" UHD LED TV', 6, '4K Real UHD Display, Quad Core Processor 4K, AI ThinQ, FilmMaker Mode', 32490.00, 26000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1461151304267-38535e780c79?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(27, 'TV-SONY-50-LED', 'Sony 50" LED TV', 6, 'Triluminos Pro Display, Clear Phase Speaker System, Slim Blade Stand', 54900.00, 44000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),

-- Air Conditioners
(28, 'AC-LG-15-SPLIT', 'LG 1.5 Ton Split AC', 7, 'Dual Inverter Compressor, 5 Star Rating, 6-in-1 Convertible Cooling, Copper Ocean Black', 44990.00, 36000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1614633837726-5b43725514ee?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(29, 'AC-SAM-15-SPLIT', 'Samsung 1.5 Ton Split AC', 7, 'WindFree Cooling, 5 Star Inverter, PM 1.0 Filter, Digital Inverter Boost', 46990.00, 38000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1614633837726-5b43725514ee?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(30, 'AC-VOL-15', 'Voltas 1.5 Ton AC', 7, 'Adjustable Inverter AC, 3 Star Rating, High Ambient Cooling up to 52°C', 35990.00, 29000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1614633837726-5b43725514ee?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(31, 'AC-DAIKIN-15', 'Daikin 1.5 Ton Inverter AC', 7, 'Triple Display, Dew Clean Technology, 5 Star Energy Efficiency Rating', 47500.00, 39000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1614633837726-5b43725514ee?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),

-- Microwave Ovens
(32, 'MIC-LG-28L', 'LG 28L Convection Microwave', 8, 'Diet Fry, Charcoal Lighting Heater, Indian Roti Basket, Stainless Steel Cavity', 17490.00, 14000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(33, 'MIC-SAM-28L', 'Samsung 28L Convection Microwave', 8, 'Slim Fry Technology, Tandoor & Curd Making, Ceramic Enamel 10-Yr Warranty Cavity', 16990.00, 13500.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),

-- Tablets
(34, 'TAB-APL-IPAD11', 'Apple iPad 11', 9, 'Liquid Retina Display, A16 Bionic, 128GB Wi-Fi, USB-C, Touch ID, Space Grey', 49900.00, 42000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(35, 'TAB-SAM-S10', 'Samsung Galaxy Tab S10', 9, 'Dynamic AMOLED 2X, S-Pen Included, 12GB RAM, 256GB, Armor Aluminum Body', 67999.00, 56000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1561154464-82e9adf32764?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(36, 'TAB-LEN-P12', 'Lenovo Tab P12', 9, '12.7" 3K Display, JBL Quad Speakers with Dolby Atmos, Octa-Core, 8GB+128GB', 26999.00, 21500.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),

-- Printers
(37, 'PRN-HP-LJPRO', 'HP LaserJet Pro', 10, 'High-speed Monochromatic Laser, Auto Duplex, Ethernet & Wi-Fi Direct', 23500.00, 18500.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(38, 'PRN-CAN-PIXMA', 'Canon Pixma Printer', 10, 'All-in-One Wireless Ink Tank Color Printer with High Yield Bottle Inks', 14200.00, 11000.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(39, 'PRN-EPS-ECO', 'Epson EcoTank Printer', 10, 'Heat-Free Technology, Ultra Low Cost Per Page, Wi-Fi & Smart Panel App', 16800.00, 13200.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),

-- Accessories
(40, 'ACC-LOG-KEY', 'Logitech Wireless Keyboard', 11, 'Multi-device Bluetooth & 2.4GHz Receiver, Low Profile Scissor Keys', 2495.00, 1600.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(41, 'ACC-LOG-MOUSE', 'Logitech Wireless Mouse', 11, 'Silent Touch Technology, Ergonomic Grip, 24-Month Battery Life, 1000 DPI Optical', 1295.00, 650.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(42, 'ACC-USB-HUB', 'USB-C Hub 7-in-1', 11, '4K HDMI, 100W Power Delivery, 3x USB 3.0, SD/MicroSD Card Slots, Aluminum', 3499.00, 1800.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1625842268584-8f3296236761?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(43, 'ACC-HDMI-CAB', 'Ultra High Speed HDMI Cable', 11, '8K@60Hz, 4K@120Hz 48Gbps, Braided 2 Meter Gold Plated Connectors', 899.00, 350.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(44, 'ACC-LAP-BAG', 'Laptop Backpack Pro', 11, 'Water-resistant Oxford fabric, Padded 15.6" Compartment, Anti-theft Pocket', 2899.00, 1200.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(45, 'ACC-HEADPHONES', 'Wireless Noise-Canceling Headphones', 11, 'Active Noise Cancellation, 40-hour Battery, Hi-Res Audio Certified', 5999.00, 3200.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(46, 'ACC-CHARGER-65W', 'GaN 65W Fast Charger', 11, 'Dual USB-C + USB-A ports, PD 3.0, QC 4.0, Compact Folding Pins', 1999.00, 850.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),
(47, 'ACC-SSD-1TB', 'External SSD 1TB USB 3.2', 11, '1050MB/s Read Speed, Drop Resistant Rugged Silicone Bumper', 8499.00, 5800.00, 18.00, 'Unit', 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500&auto=format&fit=crop&q=80', TRUE, 'ONE_TIME'),

-- Services
(48, 'SRV-LAP-INST', 'Laptop Installation Service', 12, 'On-site OS deployment, enterprise domain join, productivity suite config', 1999.00, 500.00, 18.00, 'Service', 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&auto=format&fit=crop&q=80', TRUE, 'SERVICE'),
(49, 'SRV-TV-MOUNT', 'TV Wall Mount Installation', 12, 'Heavy-duty steel bracket mounting, cable concealment, audiovisual tuning', 1499.00, 400.00, 18.00, 'Service', 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&auto=format&fit=crop&q=80', TRUE, 'SERVICE'),
(50, 'SRV-AC-INST', 'AC Installation Service', 12, 'Copper piping up to 3m, outdoor bracket installation, vacuuming and gas check', 2499.00, 800.00, 18.00, 'Service', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=80', TRUE, 'SERVICE'),
(51, 'SRV-APP-INST', 'Appliance Installation Service', 12, 'Water inlet/outlet plumbing, leveling, demo and safety earthing validation', 1299.00, 350.00, 18.00, 'Service', 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=500&auto=format&fit=crop&q=80', TRUE, 'SERVICE'),
(52, 'SRV-DATA-TRANS', 'Data Transfer Service', 12, 'Secure data migration from legacy hardware to new machines with verification report', 1799.00, 450.00, 18.00, 'Service', 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&auto=format&fit=crop&q=80', TRUE, 'SERVICE'),

-- Extended Warranties & AMC (Subscriptions)
(53, 'WRN-1YR', '1 Year Extended Warranty', 13, 'Complete hardware coverage, accidental liquid protection, zero-depreciation repair', 4999.00, 1800.00, 18.00, 'Year', 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=500&auto=format&fit=crop&q=80', TRUE, 'SUBSCRIPTION'),
(54, 'WRN-2YR', '2 Year Extended Warranty', 13, '24-month comprehensive coverage including motherboard and panel protection', 8999.00, 3200.00, 18.00, 'Year', 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=500&auto=format&fit=crop&q=80', TRUE, 'SUBSCRIPTION'),
(55, 'AMC-APPLIANCE', 'Annual Appliance AMC', 13, 'Includes 3 mandatory periodic services, gas charging, filter cleanup and labor free', 3999.00, 1500.00, 18.00, 'Year', 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=500&auto=format&fit=crop&q=80', TRUE, 'SUBSCRIPTION'),
(56, 'SUB-PREM-DEV', 'Premium Device Support', 13, '24/7 dedicated enterprise priority helpline, remote diagnostic & 4-hour SLA dispatch', 8999.00, 2500.00, 18.00, 'Year', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80', TRUE, 'SUBSCRIPTION'),
(57, 'SUB-BIZ-IT', 'Business IT Support Plan', 13, 'Fleet management, quarterly patch audits, cloud backup oversight for up to 25 devices', 24999.00, 7000.00, 18.00, 'Year', 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=500&auto=format&fit=crop&q=80', TRUE, 'SUBSCRIPTION');

-- 7. Product Variants
TRUNCATE TABLE product_variants;
INSERT INTO product_variants (id, product_id, variant_name, attribute_type, attribute_value, price_delta, sku) VALUES
(1, 1, '16GB RAM / 512GB SSD', 'Configuration', '16GB/512GB', 0.00, 'LAP-DELL-INSP15-16-512'),
(2, 1, '32GB RAM / 1TB SSD', 'Configuration', '32GB/1TB', 12000.00, 'LAP-DELL-INSP15-32-1TB'),
(3, 8, '128GB Storage', 'Storage', '128GB', 0.00, 'PHN-APL-IPH16-128'),
(4, 8, '256GB Storage', 'Storage', '256GB', 10000.00, 'PHN-APL-IPH16-256'),
(5, 21, '55 Inch Display', 'Screen Size', '55 Inch', 0.00, 'TV-SAM-55'),
(6, 21, '65 Inch Display', 'Screen Size', '65 Inch', 24000.00, 'TV-SAM-65'),
(7, 13, '260 Litres', 'Capacity', '260L', 0.00, 'REF-LG-260L-STD');

-- 8. Price Lists
TRUNCATE TABLE price_lists;
INSERT INTO price_lists (id, name, currency, customer_tier, active) VALUES
(1, 'Standard Retail & Bronze Price List', 'INR', 'BRONZE', TRUE),
(2, 'Silver Corporate Preferred Price List', 'INR', 'SILVER', TRUE),
(3, 'Gold Strategic Enterprise Price List', 'INR', 'GOLD', TRUE);

-- 9. Price List Items (Preferential pricing per tier)
TRUNCATE TABLE price_list_items;
INSERT INTO price_list_items (price_list_id, product_id, special_price, discount_pct) VALUES
-- Silver Tier (5% baseline preference)
(2, 1, 61750.00, 5.00),
(2, 21, 50340.00, 5.00),
(2, 48, 1899.00, 5.00),
(2, 54, 8549.00, 5.00),
-- Gold Tier (8-10% baseline preference)
(3, 1, 58500.00, 10.00),
(3, 21, 47690.00, 10.00),
(3, 48, 1799.00, 10.00),
(3, 54, 8099.00, 10.00);

-- 10. Discount Rules (Governance Table)
TRUNCATE TABLE discount_rules;
INSERT INTO discount_rules (id, rule_type, target_id, target_tier, max_discount_pct, description, active) VALUES
-- Tier limits
(1, 'TIER', NULL, 'BRONZE', 5.00, 'Bronze tier standard discount ceiling', TRUE),
(2, 'TIER', NULL, 'SILVER', 10.00, 'Silver tier corporate discount ceiling', TRUE),
(3, 'TIER', NULL, 'GOLD', 15.00, 'Gold tier strategic enterprise discount ceiling', TRUE),
-- Category ceilings
(4, 'CATEGORY', 1, NULL, 15.00, 'Laptops maximum allowed discount ceiling', TRUE),
(5, 'CATEGORY', 2, NULL, 12.00, 'Smartphones maximum allowed discount ceiling', TRUE),
(6, 'CATEGORY', 5, NULL, 14.00, 'Smart TVs maximum allowed discount ceiling', TRUE),
(7, 'CATEGORY', 11, NULL, 12.00, 'Accessories maximum allowed discount ceiling', TRUE),
(8, 'CATEGORY', 12, NULL, 10.00, 'Services maximum allowed discount ceiling (Strict 10% cap)', TRUE),
(9, 'CATEGORY', 13, NULL, 8.00, 'Extended Warranty & Subscriptions maximum allowed discount ceiling', TRUE);

-- 11. Approval Rules
TRUNCATE TABLE approval_rules;
INSERT INTO approval_rules (id, min_risk_pct, max_risk_pct, required_level, description, active) VALUES
(1, 0.00, 5.00, 'NOT_REQUIRED', 'No approval required (Within standard tolerance)', TRUE),
(2, 5.01, 10.00, 'MANAGER', 'Requires Sales Manager Approval', TRUE),
(3, 10.01, 100.00, 'MANAGER_FINANCE', 'Requires Dual Approval: Sales Manager then Finance/Operations', TRUE);

-- 12. Warehouses
TRUNCATE TABLE warehouses;
INSERT INTO warehouses (id, name, code, location, shipping_cost, active) VALUES
(1, 'Main Warehouse (Mumbai Central)', 'WH-MAIN', 'Plot 42, Kurla Industrial Estate, Mumbai, Maharashtra 400070', 500.00, TRUE),
(2, 'East Depot (Kolkata Hub)', 'WH-EAST', 'Sector V, Salt Lake City Logistics Park, Kolkata, West Bengal 700091', 700.00, TRUE),
(3, 'North Warehouse (Delhi NCR)', 'WH-NORTH', 'Udyog Vihar Phase IV, Gurugram, Haryana 122016', 650.00, TRUE);

-- 13. Inventory
-- CRITICAL FOR HACKATHON DEMO:
-- Dell Inspiron 15 (Product ID 1):
-- Main Warehouse = 3, East Depot = 2, North Warehouse = 0 (Total 5).
-- When an order of 5 is placed, the backend MUST split: Main 3 + East 2!
TRUNCATE TABLE inventory;
INSERT INTO inventory (product_id, warehouse_id, available_quantity, reserved_quantity, reorder_level) VALUES
-- Dell Inspiron 15 (Split demonstration)
(1, 1, 3, 0, 5),
(1, 2, 2, 0, 5),
(1, 3, 0, 0, 5),
-- HP Pavilion 14
(2, 1, 15, 0, 5),
(2, 2, 10, 0, 5),
(2, 3, 8, 0, 5),
-- Samsung Galaxy S25
(7, 1, 25, 0, 5),
(7, 2, 12, 0, 5),
(7, 3, 18, 0, 5),
-- Samsung 55" 4K Smart TV
(21, 1, 12, 0, 3),
(21, 2, 8, 0, 3),
(21, 3, 10, 0, 3),
-- Accessories (plenty of stock)
(40, 1, 50, 0, 10),
(41, 1, 80, 0, 15),
(41, 2, 40, 0, 15),
(42, 1, 60, 0, 10),
(43, 1, 100, 0, 20),
(44, 1, 45, 0, 10),
-- Services and Subscriptions (Virtually unlimited service capacity)
(48, 1, 999, 0, 0),
(49, 1, 999, 0, 0),
(50, 1, 999, 0, 0),
(53, 1, 999, 0, 0),
(54, 1, 999, 0, 0),
(55, 1, 999, 0, 0),
(56, 1, 999, 0, 0);

-- 14. Upsell & Cross-Sell Rules
TRUNCATE TABLE upsell_rules;
INSERT INTO upsell_rules (id, trigger_product_id, recommended_product_id, recommendation_type, reason, margin_delta, is_promoted, promo_tag, active) VALUES
-- Dell Inspiron 15 Recommendations
(1, 1, 41, 'ATTACHMENT', 'Frequently purchased with enterprise laptops (87% attach rate)', 645.00, TRUE, 'Best Seller', TRUE),
(2, 1, 44, 'ATTACHMENT', 'Executive Water-resistant Laptop Backpack with device cushion', 1699.00, FALSE, 'Recommended', TRUE),
(3, 1, 54, 'UPSELL', '2 Year Comprehensive Extended Warranty (Protects Motherboard & Display)', 5799.00, TRUE, 'High Margin', TRUE),
(4, 1, 42, 'ATTACHMENT', '7-in-1 USB-C Multiport Hub for dual screen presentation', 1699.00, FALSE, 'Trending', TRUE),
(5, 1, 48, 'SERVICE', 'Professional Onsite OS Deployment & Domain Join Service', 1499.00, FALSE, 'Essential Service', TRUE),
-- Smart TV Recommendations
(6, 21, 49, 'SERVICE', 'Professional Heavy Duty Wall Mount Installation & Cabling', 1099.00, TRUE, 'Recommended', TRUE),
(7, 21, 43, 'ATTACHMENT', 'Ultra High Speed 8K/4K 48Gbps Braided HDMI Cable', 549.00, FALSE, 'Essential', TRUE),
(8, 21, 54, 'UPSELL', '2 Year Extended Warranty on 4K Panel and Power Supply', 5799.00, TRUE, 'Peace of Mind', TRUE),
-- Refrigerator Recommendations
(9, 13, 55, 'SERVICE', 'Annual Appliance AMC (3 Free Periodic Servicing Visits)', 2499.00, TRUE, 'Recommended', TRUE),
-- AC Recommendations
(10, 28, 50, 'SERVICE', 'Certified Copper Pipe Installation & Gas Pressure Check', 1699.00, TRUE, 'Mandatory for Warranty', TRUE),
(11, 28, 55, 'SERVICE', 'Annual Maintenance Contract for Seasonal AC Servicing', 2499.00, FALSE, 'Value Pack', TRUE);

-- 15. Subscription Plans
TRUNCATE TABLE subscription_plans;
INSERT INTO subscription_plans (id, product_id, plan_name, billing_interval, price, cancellation_rule, refund_rule, active) VALUES
(1, 56, 'Premium Device Support - Monthly', 'MONTHLY', 999.00, 'Cancel anytime with 7 days notice', 'No refund on partial month', TRUE),
(2, 56, 'Premium Device Support - Quarterly', 'QUARTERLY', 2699.00, 'Standard 15-day notice', 'Prorated refund for unstarted months', TRUE),
(3, 56, 'Premium Device Support - Yearly', 'YEARLY', 8999.00, 'Annual renewal with 30-day notice', 'Prorated refund within 30 days', TRUE),
(4, 55, 'Annual Appliance AMC - Yearly', 'YEARLY', 3999.00, 'Annual plan with auto-renewal', 'Refund within 14 days if unutilized', TRUE),
(5, 57, 'Business IT Support - Yearly', 'YEARLY', 24999.00, 'Enterprise SLA 60-day notice', 'Prorated refund based on quarters remaining', TRUE);

-- 16. Seed Demo Quotations:
-- A) Golden Demo Quotation (Q-2026-1001) for Metro Office Systems
-- 5x Dell Inspiron 15 + 5x Installation Service + 5x 2-Year Warranty
-- Dell discount = 12% (within 15% ceiling)
-- Installation discount = 18% (EXCEEDS 10% ceiling by 8%!)
-- Warranty discount = 10% (EXCEEDS 8% ceiling by 2%!)
-- Triggers PENDING_MANAGER approval automatically!
TRUNCATE TABLE quotations;
INSERT INTO quotations (
  id, quotation_number, customer_id, salesperson_id, status, approval_status,
  subtotal, total_discount, tax_amount, total_amount, total_cost, margin_amount, margin_pct,
  risk_score, risk_level, risk_reason, currency, valid_until, notes, created_at, last_activity_at
) VALUES (
  1, 'Q-2026-1001', 1, 4, 'PENDING_APPROVAL', 'PENDING_MANAGER',
  379990.00, 48494.00, 59669.28, 391165.28, 278500.00, 52996.00, 15.98,
  8.45, 'MEDIUM', 'Installation Service exceeds category discount ceiling by 8.00%; Extended Warranty exceeds category discount ceiling by 2.00%',
  'INR', DATE_ADD(CURDATE(), INTERVAL 14 DAY), 'Enterprise IT refresh package for Gokuldham branch offices.', NOW(), NOW()
);

TRUNCATE TABLE quotation_items;
INSERT INTO quotation_items (
  id, quotation_id, product_id, variant_id, item_type, quantity,
  unit_price, cost_price, discount_pct, discount_amount, tax_pct, tax_amount, line_total,
  allowed_discount_pct, discount_overage_pct, line_risk_score, billing_interval
) VALUES
-- 5x Dell Inspiron 15: Unit 65,000 * 5 = 325,000; Discount 12% = 39,000. Allowed: 15%. Overage: 0%.
(1, 1, 1, 1, 'ONE_TIME', 5, 65000.00, 52000.00, 12.00, 39000.00, 18.00, 51480.00, 337480.00, 15.00, 0.00, 0.00, 'ONE_TIME'),
-- 5x Laptop Installation Service: Unit 1,999 * 5 = 9,995; Discount 18% = 1,799.10. Allowed: 10%. Overage: 8%!
(2, 1, 48, NULL, 'SERVICE', 5, 1999.00, 500.00, 18.00, 1799.10, 18.00, 1475.26, 9671.16, 10.00, 8.00, 8.00, 'ONE_TIME'),
-- 5x 2 Year Extended Warranty: Unit 8,999 * 5 = 44,995; Discount 10% = 4,499.50. Allowed: 8%. Overage: 2%!
(3, 1, 54, NULL, 'SUBSCRIPTION', 5, 8999.00, 3200.00, 10.00, 4499.50, 18.00, 7289.19, 47784.69, 8.00, 2.00, 2.00, 'YEARLY');

-- Approval Request for Q-2026-1001
TRUNCATE TABLE approval_requests;
INSERT INTO approval_requests (
  id, quotation_id, requested_by, level, status, assigned_to, risk_score, risk_summary, created_at
) VALUES (
  1, 1, 4, 'MANAGER', 'PENDING', 2, 8.45,
  'Discount overage detected on Installation Service (18% vs 10% max) and Extended Warranty (10% vs 8% max). Requires Manager review.',
  NOW()
);

-- Approval History for Q-2026-1001
TRUNCATE TABLE approval_history;
INSERT INTO approval_history (
  id, approval_request_id, quotation_id, action_by, action, comments, previous_status, new_status, created_at
) VALUES (
  1, 1, 1, 4, 'SUBMIT', 'Submitted for manager approval due to service discount tier exception.', 'DRAFT', 'PENDING_APPROVAL', NOW()
);

-- B) Quotation Q-2026-1002 (Stalled Deal demonstration with Deal Health = 42/100)
INSERT INTO quotations (
  id, quotation_number, customer_id, salesperson_id, status, approval_status,
  subtotal, total_discount, tax_amount, total_amount, total_cost, margin_amount, margin_pct,
  risk_score, risk_level, risk_reason, currency, valid_until, notes, created_at, last_activity_at
) VALUES (
  2, 'Q-2026-1002', 4, 4, 'SENT', 'NOT_REQUIRED',
  165000.00, 24750.00, 25245.00, 165495.00, 135000.00, 5250.00, 3.74,
  15.00, 'HIGH', 'Stalled quotation with no customer interaction for 4 days. Unusually low margin.',
  'INR', DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'Conference room television setup.',
  DATE_SUB(NOW(), INTERVAL 4 DAY), DATE_SUB(NOW(), INTERVAL 4 DAY)
);

INSERT INTO quotation_items (
  id, quotation_id, product_id, variant_id, item_type, quantity,
  unit_price, cost_price, discount_pct, discount_amount, tax_pct, tax_amount, line_total,
  allowed_discount_pct, discount_overage_pct, line_risk_score, billing_interval
) VALUES
(4, 2, 22, NULL, 'ONE_TIME', 1, 165000.00, 135000.00, 15.00, 24750.00, 18.00, 25245.00, 165495.00, 14.00, 1.00, 1.00, 'ONE_TIME');

-- 17. Deal Health Records
TRUNCATE TABLE deal_health;
INSERT INTO deal_health (
  id, quotation_id, health_score, status,
  inactivity_deduction, discount_risk_deduction, approval_delay_deduction, delivery_slippage_deduction, negotiation_deduction,
  explanation, calculated_at
) VALUES
(1, 1, 78, 'HEALTHY', 0, 15, 7, 0, 0, 'Quotation is actively progressing through approval. Moderate discount risk (-15).', NOW()),
(2, 2, 42, 'AT_RISK', 25, 20, 0, 0, 13, 'Customer inactivity for 4 days (-25); High discount erosion on TV line (-20); Stalled communication (-13).', DATE_SUB(NOW(), INTERVAL 1 HOUR));

-- 18. Anomalies
TRUNCATE TABLE anomalies;
INSERT INTO anomalies (
  id, quotation_id, salesperson_id, anomaly_type, description, severity, resolved, created_at
) VALUES
(1, 2, 4, 'HIGH_DISCOUNT', 'Sales rep Vaishnavi Shah applied 15.00% discount on LG OLED 65" TV which exceeds the category cap of 14% and the rep historical average of 7.2%.', 'HIGH', FALSE, DATE_SUB(NOW(), INTERVAL 2 DAY));

-- 19. Smart Follow-ups
TRUNCATE TABLE follow_ups;
INSERT INTO follow_ups (
  id, quotation_id, customer_id, salesperson_id, title, reason, priority, due_date, status, action_taken, created_at
) VALUES
(1, 2, 4, 4, 'Follow up with Popatlal on Conference TV Quote', 'Deal health dropped to 42 (At Risk). Customer has not responded in 4 days.', 'URGENT', CURDATE(), 'PENDING', NULL, DATE_SUB(NOW(), INTERVAL 1 DAY)),
(2, 1, 1, 4, 'Prepare warehouse allocation for Metro Office Systems', 'Pre-fulfillment stock reservation check needed upon Manager approval.', 'MEDIUM', DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'PENDING', NULL, NOW());

-- 20. Notifications
TRUNCATE TABLE notifications;
INSERT INTO notifications (
  id, user_id, title, message, type, link_url, is_read, created_at
) VALUES
(1, 2, 'New Approval Required: Q-2026-1001', 'Quotation Q-2026-1001 for Metro Office Systems requires approval due to Service discount exception.', 'APPROVAL_REQUIRED', '/manager/approvals', FALSE, NOW()),
(2, 4, 'Deal Health Warning: Q-2026-1002', 'Quotation Q-2026-1002 for Sunrise Enterprises has fallen to Deal Health 42/100 (At Risk). Urgent follow-up scheduled.', 'DEAL_AT_RISK', '/sales/follow-ups', FALSE, NOW()),
(3, 6, 'Quotation Received: Q-2026-1001', 'Your enterprise quotation for 5x Dell Inspiron 15 systems has been generated by Gada Electronics.', 'COUNTER_OFFER', '/customer/quotations/1', FALSE, NOW());

-- 21. Audit Logs
TRUNCATE TABLE audit_logs;
INSERT INTO audit_logs (
  id, quotation_id, user_id, user_role, action, old_value, new_value, reason, ip_address, created_at
) VALUES
(1, 1, 4, 'SALES_REP', 'QUOTE_CREATED', NULL, 'Draft Quotation Q-2026-1001', 'Initial quotation generation for Metro Office Systems', '127.0.0.1', DATE_SUB(NOW(), INTERVAL 2 HOUR)),
(2, 1, 4, 'SALES_REP', 'DISCOUNT_CHANGED', '0%', 'Laptop: 12%, Installation: 18%, Warranty: 10%', 'Applied bundle discount requested by client', '127.0.0.1', DATE_SUB(NOW(), INTERVAL 1 HOUR)),
(3, 1, 4, 'SALES_REP', 'SUBMITTED_FOR_APPROVAL', 'DRAFT', 'PENDING_APPROVAL', 'Automated trigger: Service discount exceeds 10% ceiling', '127.0.0.1', DATE_SUB(NOW(), INTERVAL 45 MINUTE));

SET FOREIGN_KEY_CHECKS = 1;
