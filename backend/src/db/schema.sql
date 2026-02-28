-- Users Table
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    role VARCHAR(20) CHECK (role IN ('customer', 'internal_user', 'owner')) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    bp_code VARCHAR(50), -- SAP Business Partner Code
    company_name VARCHAR(255),
    gst_number VARCHAR(50),
    pan_number VARCHAR(50),
    address TEXT, -- Store JSON or formatted address string
    price_list VARCHAR(20) DEFAULT 'Master', -- Master/A/B/C
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
    device_limit INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Items Master Table
CREATE TABLE items (
    item_id SERIAL PRIMARY KEY,
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    subcategory VARCHAR(100),
    hsn_code VARCHAR(50),
    inventory_type VARCHAR(20) CHECK (inventory_type IN ('serial', 'batch', 'none')),
    unit_of_measure VARCHAR(20),
    master_price DECIMAL(10, 2),
    a_price DECIMAL(10, 2),
    b_price DECIMAL(10, 2),
    c_price DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    -- Enhanced Metadata columns
    sap_item_name VARCHAR(255),
    ecom_display_name VARCHAR(255),
    fabric_type VARCHAR(255),
    design_type VARCHAR(255),
    color_type VARCHAR(255),
    design_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Item Images (Master images like Pallu, Body, Border)
CREATE TABLE item_images (
    image_id SERIAL PRIMARY KEY,
    item_id INT REFERENCES items(item_id) ON DELETE CASCADE,
    image_type VARCHAR(20) CHECK (image_type IN ('pallu', 'body', 'border', 'general')),
    image_url TEXT NOT NULL,
    is_master BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Serials (Individual Unique Items)
CREATE TABLE serials (
    serial_id SERIAL PRIMARY KEY,
    item_id INT REFERENCES items(item_id) ON DELETE CASCADE,
    serial_number VARCHAR(50) UNIQUE NOT NULL,
    batch_number VARCHAR(50), -- Nullable for serial-tracked items
    image_url TEXT, -- Specific image for this serial
    quantity INT DEFAULT 1, -- Usually 1 for serials, more for batches
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'sold')),
    date_added TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    added_by INT REFERENCES users(user_id),
    sold_date TIMESTAMP,
    sold_to INT REFERENCES users(user_id),
    sold_type VARCHAR(20) CHECK (sold_type IN ('b2b', 'b2c', 'cash'))
);

-- Orders Table
CREATE TABLE orders (
    order_id SERIAL PRIMARY KEY,
    order_number VARCHAR(50) UNIQUE NOT NULL, -- e.g., ORD-2025-0001
    customer_id INT REFERENCES users(user_id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'dispatched', 'delivered', 'completed')),
    total_amount DECIMAL(12, 2) NOT NULL,
    notes TEXT,
    -- SAP Integration Fields
    sap_so_number VARCHAR(50),
    sap_delivery_number VARCHAR(50),
    sap_invoice_number VARCHAR(50),
    sap_payment_number VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'pending',
    confirmed_by INT REFERENCES users(user_id),
    confirmed_at TIMESTAMP
);

-- Order Items
CREATE TABLE order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,
    item_id INT REFERENCES items(item_id),
    serial_id INT REFERENCES serials(serial_id), -- Nullable if bulk item
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'replaced', 'rejected')),
    replacement_serial_id INT REFERENCES serials(serial_id), -- If original was replaced
    notes TEXT
);

-- Cart (For 15-minute reservation logic)
CREATE TABLE cart (
    cart_id SERIAL PRIMARY KEY,
    customer_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    serial_id INT REFERENCES serials(serial_id) ON DELETE CASCADE, -- Unique constraint per customer/serial usually
    quantity INT DEFAULT 1,
    reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL, -- reserved_at + 15 mins
    CONSTRAINT unique_cart_item UNIQUE (customer_id, serial_id)
);

-- Audit Tables
CREATE TABLE stock_audits (
    audit_id SERIAL PRIMARY KEY,
    audit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    conducted_by INT REFERENCES users(user_id),
    status VARCHAR(20) DEFAULT 'in_progress',
    approved_by INT REFERENCES users(user_id),
    approved_at TIMESTAMP
);

CREATE TABLE audit_discrepancies (
    discrepancy_id SERIAL PRIMARY KEY,
    audit_id INT REFERENCES stock_audits(audit_id) ON DELETE CASCADE,
    serial_id INT REFERENCES serials(serial_id),
    type VARCHAR(20) CHECK (type IN ('missing', 'extra')),
    resolved BOOLEAN DEFAULT FALSE,
    notes TEXT
);

-- Price Lists
CREATE TABLE price_lists (
    price_list_id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE price_list_items (
    price_list_id INT REFERENCES price_lists(price_list_id) ON DELETE CASCADE,
    item_id INT REFERENCES items(item_id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (price_list_id, item_id)
);

-- Remember to run: ALTER TABLE users ADD COLUMN price_list_id INT REFERENCES price_lists(price_list_id) ON DELETE SET NULL;

