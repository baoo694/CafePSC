# ☕ CaféPSC - Real-time Coffee Ordering App

A modern, real-time coffee ordering web application built for students. Features instant order updates, beautiful UI, and seamless order management.

![CaféPSC](https://img.shields.io/badge/Made%20with-React%20%2B%20Node.js-blue)

## ✨ Features

### For Customers
- 📋 Browse real-time menu with availability status
- 🎨 Customize drinks (size, sugar, ice, toppings)
- 🛒 Add to cart and place orders easily
- 📊 Track order status: `pending` → `making` → `done`
- 🔔 Receive live notifications on status changes
- 📍 See queue position in real-time

### For Admin
- 🔐 Password-protected admin access
- 📱 Real-time order dashboard
- 🔔 Instant notification on new orders (with sound)
- ✅ One-click status updates
- 🔄 Enable/disable menu items
- 📊 Sales statistics and analytics
- 🗑️ Reset orders per session (keeps completed orders for stats)

## 🛠️ Tech Stack

- **Frontend:** React 18 + Vite
- **Backend:** Node.js + Express
- **Real-time:** Socket.IO
- **Database:** Supabase (PostgreSQL)
- **Styling:** CSS Modules

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (free tier works!)

### 1. Set up Supabase Database

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema from `database/schema.sql`
3. Copy your project URL and anon key from Settings → API

### 2. Configure Backend

```bash
cd backend
npm install

# Create .env file
cp .env.example .env  # or create manually
```

Edit `.env` with your Supabase credentials:

```env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
ADMIN_PASSWORD=your-secure-password
```

> **Lưu ý:** Nếu không đặt `ADMIN_PASSWORD`, mật khẩu mặc định là `admin123`

### 3. Configure Frontend

```bash
cd frontend
npm install
```

### 4. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Access the App

- **Customer View:** http://localhost:5173
- **Admin Dashboard:** http://localhost:5173/admin

## 📁 Project Structure

```
CafePSC/
├── backend/
│   ├── server.js          # Express + Socket.IO server
│   ├── package.json
│   └── .env               # Environment variables
├── frontend/
│   ├── src/
│   │   ├── api/           # API functions
│   │   ├── components/    # React components
│   │   ├── context/       # Socket.IO context
│   │   ├── pages/         # Page components
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css      # Global styles
│   ├── index.html
│   └── package.json
├── database/
│   └── schema.sql         # Database schema
└── README.md
```

## 🗄️ Database Schema

### products
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| name | VARCHAR | Product name |
| price | DECIMAL | Price in VND |
| category | VARCHAR | coffee/tea/smoothie/juice |
| is_available | BOOLEAN | Availability status |

### orders
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| customer_name | VARCHAR | Customer's display name |
| status | VARCHAR | pending/making/done/cancelled |
| note | TEXT | Order notes |
| created_at | TIMESTAMP | Order timestamp |

### order_items
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| order_id | INTEGER | FK to orders |
| product_id | INTEGER | FK to products |
| quantity | INTEGER | Item quantity |
| options_json | JSONB | Customization options |

## 🔌 Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `menu:update` | Server → Client | Menu item updated |
| `order:new` | Server → Client | New order placed |
| `order:status` | Server → Client | Order status changed |
| `orders:reset` | Server → Client | All orders cleared |
| `join:customer` | Client → Server | Join customer room |
| `join:admin` | Client → Server | Join admin room |

## 📸 Screenshots

### Landing Page
- Beautiful entry with animated coffee cup
- Simple name input to start ordering

### Menu View
- Category filtering (Coffee, Tea, Smoothie, Juice)
- Real-time availability updates
- Drink customization modal

### Cart & Order
- Slide-in cart drawer
- Order notes support
- Real-time order tracking

### Admin Dashboard
- Status filter tabs
- One-click status updates
- Menu availability toggles
- Session reset functionality

## 🎨 Design System

The app uses a warm, coffee-inspired color palette:

- **Espresso:** `#2C1810` - Primary dark
- **Cream:** `#F5E6D3` - Light background
- **Caramel:** `#C4853C` - Accent color
- **Status colors:** Pending (amber), Making (blue), Done (green)

Typography: Playfair Display (headings) + DM Sans (body)

## 📝 License

MIT License - feel free to use this for your own coffee shop!

---

Built with ❤️ and ☕ for PSC Students

