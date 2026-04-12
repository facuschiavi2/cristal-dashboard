export type Product = {
  id: number;
  name: string;
  sku?: string;
  category_id?: number;
  brand_id?: number;
  category_name: string;
  brand_name: string;
  price: number;
  unit: string;
  stock?: number;
  discontinued?: number;
  description?: string;
  technical_info?: string;
};

export type Category = {
  id: number;
  name: string;
};

export type Client = {
  id: number;
  name: string;
  phone: string;
  location?: string;
  address: string;
  notes?: string;
  email?: string;
  lat?: number;
  lng?: number;
  created_at: string;
};

export type OrderItem = {
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
};

export type Order = {
  id: number;
  order_number?: string;
  client_id: number;
  client_name: string;
  client_phone?: string;
  items: string;
  total: number;
  status: "pending" | "confirmed" | "delivered" | "cancelled";
  payment: string;
  payment_status?: "pending" | "paid";
  payment_method?: string;
  delivery_address?: string;
  delivery_fee?: number;
  scheduled_date?: string;
  scheduled_time?: string;
  notes?: string;
  created_at: string;
  delivered_date?: string;
};

export type OrderDetail = Order & {
  client: Client;
  items: OrderItem[];
};

export type Lead = {
  id: number;
  name: string;
  phone: string;
  address: string;
  created_at: string;
  status: "nuevo" | "convertido";
};

export type Complaint = {
  order_number?: string;
  id: number;
  order_id?: number;
  client_id?: number;
  client_name?: string;
  product_id?: number;
  product_name?: string;
  title?: string;
  reason: string;
  description: string;
  status: "open" | "investigating" | "resolved";
  created_at: string;
};

export type User = {
  id: number;
  username: string;
  role: "admin" | "operator";
};

export type DashboardSummary = {
  totalClients: number;
  totalProducts: number;
  ordersToday: number;
  ordersMonth: number;
  ordersPending: number;
  ordersDelivered: number;
  ordersCancelled: number;
  revenueToday: number;
  revenueMonth: number;
  revenueTotal: number;
  pendingDeliveries: number;
  lowStock: number;
  pendingLeads: number;
  openReclamos: number;
  newClientsThisMonth: number;
  averageOrderValue: number;
};
