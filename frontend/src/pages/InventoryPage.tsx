import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight, 
  History, 
  BarChart3, 
  MoreVertical,
  Edit,
  Trash2,
  Box,
  Truck,
  Layers,
  ChevronRight,
  TrendingUp,
  Download,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  QrCode
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BarcodeScanner from '@/components/inventory/BarcodeScanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { format } from 'date-fns';

const InventoryPage: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('items');
  const { hasPermission } = usePermissions();

  // Modal states
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isEditSupplierOpen, setIsEditSupplierOpen] = useState(false);
  const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState<'new' | 'edit' | 'fast_adjust'>('new');
  const [isFastAdjustOpen, setIsFastAdjustOpen] = useState(false);
  const [fastAdjustSearchTerm, setFastAdjustSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [adjustmentType, setAdjustmentType] = useState('Addition');
  const [adjustmentQuantity, setAdjustmentQuantity] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');

  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [newSupplier, setNewSupplier] = useState({
    name: '', contact_person: '', phone: '', email: '', address: ''
  });
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

  const [newItem, setNewItem] = useState({
    name: '', sku: '', category_id: '', supplier_id: '', description: '',
    unit: '', stock_level: 0, min_stock_level: 5, unit_price: 0,
    expiry_date: '', location: ''
  });
  const [editingItem, setEditingItem] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const baseUrl = (window as any).API_BASE_URL || '/api';
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [itemsRes, catsRes, supsRes, transRes] = await Promise.all([
        fetch(`${baseUrl}/api/inventory/items`, { headers }),
        fetch(`${baseUrl}/api/inventory/categories`, { headers }),
        fetch(`${baseUrl}/api/inventory/suppliers`, { headers }),
        fetch(`${baseUrl}/api/inventory/transactions`, { headers })
      ]);

      if (itemsRes.ok) setItems(await itemsRes.json());
      if (catsRes.ok) setCategories(await catsRes.json());
      if (supsRes.ok) setSuppliers(await supsRes.json());
      if (transRes.ok) setTransactions(await transRes.json());
    } catch (error) {
      console.error("Error fetching inventory data:", error);
      toast.error("Failed to load inventory data.");
    } finally {
      setLoading(false);
    }
  };

  const [scannerBuffer, setScannerBuffer] = useState('');
  const [lastScanTime, setLastScanTime] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Hardware scanners type very fast. We detect this by measuring time between keys.
      const now = Date.now();
      const diff = now - lastScanTime;
      
      // If the key is 'Enter', process the buffer if it looks like a scan
      if (e.key === 'Enter') {
        if (scannerBuffer.length > 3 && (now - lastScanTime) < 100) {
          // It's likely a scan!
          const scannedSku = scannerBuffer;
          setScannerBuffer('');
          
          if (isAddItemOpen) {
            setNewItem(prev => ({ ...prev, sku: scannedSku }));
            toast.success(`Hardware Scan: ${scannedSku}`);
          } else if (isEditItemOpen) {
            setEditingItem(prev => ({ ...prev, sku: scannedSku }));
            toast.success(`Hardware Scan: ${scannedSku}`);
          } else if (isFastAdjustOpen) {
            const match = items.find(i => i.sku && i.sku.toLowerCase() === scannedSku.toLowerCase());
            if (match) {
              setSelectedItem(match);
              setFastAdjustSearchTerm(match.name);
              toast.success(`Item selected: ${match.name}`);
            } else {
              setFastAdjustSearchTerm(scannedSku);
              toast.error('Item not found for scanned SKU');
            }
          } else {
            // If no modal is open, search for the item
            setSearchQuery(scannedSku);
            toast.success(`Searching for scanned SKU: ${scannedSku}`);
          }
        } else {
          setScannerBuffer('');
        }
        return;
      }

      // Ignore modifiers
      if (e.key.length > 1) return;

      // If typing is fast enough, add to buffer
      if (diff < 50 || scannerBuffer === '') {
        setScannerBuffer(prev => prev + e.key);
      } else {
        setScannerBuffer(e.key);
      }
      setLastScanTime(now);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scannerBuffer, lastScanTime, isAddItemOpen, isEditItemOpen, isFastAdjustOpen, items]);

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const baseUrl = (window as any).API_BASE_URL || '/api';
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/inventory/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newItem)
      });

      if (res.ok) {
        toast.success("Item added successfully.");
        setIsAddItemOpen(false);
        setNewItem({
          name: '', sku: '', category_id: '', supplier_id: '', description: '',
          unit: '', stock_level: 0, min_stock_level: 5, unit_price: 0,
          expiry_date: '', location: ''
        });
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to add item.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const baseUrl = (window as any).API_BASE_URL || '/api';
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/inventory/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCategory)
      });

      if (res.ok) {
        toast.success("Category added successfully.");
        setIsAddCategoryOpen(false);
        setNewCategory({ name: '', description: '' });
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to add category.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const baseUrl = (window as any).API_BASE_URL || '/api';
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/inventory/suppliers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSupplier)
      });

      if (res.ok) {
        toast.success("Supplier added successfully.");
        setIsAddSupplierOpen(false);
        setNewSupplier({ name: '', contact_person: '', phone: '', email: '', address: '' });
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to add supplier.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    }
  };

  const handleScan = (sku: string) => {
    if (scannerTarget === 'new') {
      setNewItem({ ...newItem, sku });
      toast.success(`Scanned: ${sku}`);
    } else if (scannerTarget === 'edit') {
      setEditingItem({ ...editingItem, sku });
      toast.success(`Scanned: ${sku}`);
    } else if (scannerTarget === 'fast_adjust') {
      const match = items.find(i => i.sku && i.sku.toLowerCase() === sku.toLowerCase());
      if (match) {
        setSelectedItem(match);
        setFastAdjustSearchTerm(match.name);
        toast.success(`Item selected: ${match.name}`);
      } else {
        setFastAdjustSearchTerm(sku);
        toast.error('Item not found for scanned SKU');
      }
    }
    setIsScannerOpen(false);
  };

  const handleAdjustStock = async () => {
    if (!selectedItem || !adjustmentQuantity) return;
    
    try {
      const baseUrl = (window as any).API_BASE_URL || '/api';
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/inventory/items/${selectedItem.id}/adjust`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: parseInt(adjustmentQuantity),
          transaction_type: adjustmentType,
          reason: adjustmentReason
        })
      });

      if (res.ok) {
        toast.success("Stock updated successfully.");
        setIsAdjustStockOpen(false);
        setIsFastAdjustOpen(false);
        setAdjustmentQuantity('');
        setAdjustmentReason('');
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to adjust stock.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      const baseUrl = (window as any).API_BASE_URL || '/api';
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/inventory/items/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingItem)
      });

      if (res.ok) {
        toast.success("Item updated successfully.");
        setIsEditItemOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update item.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    try {
      const baseUrl = (window as any).API_BASE_URL || '/api';
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/inventory/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingCategory)
      });

      if (res.ok) {
        toast.success("Category updated successfully.");
        setIsEditCategoryOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update category.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    }
  };

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier) return;
    try {
      const baseUrl = (window as any).API_BASE_URL || '/api';
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/inventory/suppliers/${editingSupplier.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingSupplier)
      });

      if (res.ok) {
        toast.success("Supplier updated successfully.");
        setIsEditSupplierOpen(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update supplier.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      const baseUrl = (window as any).API_BASE_URL || '/api';
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/inventory/items/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Item deleted successfully.");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete item.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this category? This will not delete items in this category.")) return;
    try {
      const baseUrl = (window as any).API_BASE_URL || '/api';
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/inventory/categories/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Category deleted successfully.");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete category.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;
    try {
      const baseUrl = (window as any).API_BASE_URL || '/api';
      const token = localStorage.getItem('token');
      const res = await fetch(`${baseUrl}/api/inventory/suppliers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        toast.success("Supplier deleted successfully.");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete supplier.");
      }
    } catch (error) {
      toast.error("An unexpected error occurred.");
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const lowStockItems = items.filter(item => item.stock_level <= item.min_stock_level);
  const expiringSoon = items.filter(item => {
    if (!item.expiry_date) return false;
    const expiry = new Date(item.expiry_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry < thirtyDaysFromNow;
  });

  return (
    <MainLayout>
      <div className="space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-primary/10 rounded-xl sm:rounded-2xl text-primary">
                <Package className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-foreground">Inventory Management</h1>
            </div>
            <p className="text-muted-foreground font-medium text-xs sm:text-base pl-4 border-l-4 border-primary/20 ml-1 py-1">
              Track stock levels, suppliers, and clinical supplies.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-2 w-full md:w-auto">
            {hasPermission('adjust_stock') && (
              <>
                <Button 
                  onClick={() => {
                    setSelectedItem(null);
                    setAdjustmentType('Addition');
                    setFastAdjustSearchTerm('');
                    setAdjustmentQuantity('');
                    setAdjustmentReason('');
                    setIsFastAdjustOpen(true);
                  }}
                  className="flex items-center gap-1 sm:gap-2 bg-green-600 hover:bg-green-700 text-white w-full"
                >
                  <ArrowUpRight className="h-4 w-4 shrink-0" />
                  <span className="truncate">Restock</span>
                </Button>
                <Button 
                  onClick={() => {
                    setSelectedItem(null);
                    setAdjustmentType('Deduction');
                    setFastAdjustSearchTerm('');
                    setAdjustmentQuantity('');
                    setAdjustmentReason('');
                    setIsFastAdjustOpen(true);
                  }}
                  className="flex items-center gap-1 sm:gap-2 bg-rose-600 hover:bg-rose-700 text-white w-full"
                >
                  <ArrowDownRight className="h-4 w-4 shrink-0" />
                  <span className="truncate">Deduct</span>
                </Button>
              </>
            )}
            {hasPermission('manage_inventory') && (
              <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
                <DialogTrigger>
                  <Button className="flex items-center gap-1 sm:gap-2 bg-primary hover:bg-primary/90 col-span-2 w-full">
                    <Plus className="h-4 w-4 shrink-0" />
                    <span className="truncate">New Item</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Inventory Item</DialogTitle>
                    <DialogDescription>Enter details for the new clinical item.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddItem} className="grid grid-cols-2 gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Item Name</Label>
                        <Input id="name" placeholder="e.g. Paracetamol 500mg" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU / Code</Label>
                        <div className="flex gap-2">
                          <Input id="sku" placeholder="e.g. MED-001" value={newItem.sku} onChange={e => setNewItem({...newItem, sku: e.target.value})} className="flex-1" />
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="icon" 
                            onClick={() => { setScannerTarget('new'); setIsScannerOpen(true); }}
                            className="shrink-0"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select onValueChange={v => setNewItem({...newItem, category_id: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Supplier</Label>
                      <Select onValueChange={v => setNewItem({...newItem, supplier_id: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                      <div className="space-y-2">
                        <Label htmlFor="unit">Unit (e.g. Tablets, Packs)</Label>
                        <Input id="unit" placeholder="Packs" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} />
                      </div>
                    <div className="space-y-2">
                      <Label htmlFor="stock">Initial Stock Level</Label>
                      <Input id="stock" type="number" value={newItem.stock_level} onChange={e => setNewItem({...newItem, stock_level: parseInt(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="min_stock">Reorder Level (Min)</Label>
                      <Input id="min_stock" type="number" value={newItem.min_stock_level} onChange={e => setNewItem({...newItem, min_stock_level: parseInt(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Unit Price</Label>
                      <Input id="price" type="number" step="0.01" value={newItem.unit_price} onChange={e => setNewItem({...newItem, unit_price: parseFloat(e.target.value)})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiry">Expiry Date</Label>
                      <Input id="expiry" type="date" value={newItem.expiry_date} onChange={e => setNewItem({...newItem, expiry_date: e.target.value})} />
                    </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Storage Location</Label>
                        <Input id="location" placeholder="Shelf A, Cabinet 3" value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})} />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="desc">Description</Label>
                        <Input id="desc" placeholder="Brief description of the item..." value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
                      </div>
                    <DialogFooter className="col-span-2 mt-4">
                      <Button type="submit">Create Item</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border-none shadow-sm bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2">
              <CardDescription className="text-blue-600 font-bold uppercase text-[10px] sm:text-xs tracking-wider truncate">Total Items</CardDescription>
              <CardTitle className="text-xl sm:text-3xl font-black flex items-center justify-between">
                {items.length}
                <Box className="h-5 w-5 sm:h-8 sm:w-8 text-blue-500 opacity-20 shrink-0" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 truncate">
                <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" /> <span className="truncate">All systems functional</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-amber-500/10 to-amber-500/5">
            <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2">
              <CardDescription className="text-amber-600 font-bold uppercase text-[10px] sm:text-xs tracking-wider truncate">Low Stock</CardDescription>
              <CardTitle className="text-xl sm:text-3xl font-black flex items-center justify-between text-amber-700">
                {lowStockItems.length}
                <AlertTriangle className="h-5 w-5 sm:h-8 sm:w-8 text-amber-500 opacity-20 shrink-0" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 truncate">
                {lowStockItems.length > 0 ? "Requires reordering soon" : "All items well stocked"}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-rose-500/10 to-rose-500/5">
            <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2">
              <CardDescription className="text-rose-600 font-bold uppercase text-[10px] sm:text-xs tracking-wider truncate">Expiring Soon</CardDescription>
              <CardTitle className="text-xl sm:text-3xl font-black flex items-center justify-between text-rose-700">
                {expiringSoon.length}
                <Clock className="h-5 w-5 sm:h-8 sm:w-8 text-rose-500 opacity-20 shrink-0" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 truncate">
                Items within 30 days of expiry
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardHeader className="p-3 pb-1 sm:p-6 sm:pb-2">
              <CardDescription className="text-green-600 font-bold uppercase text-[10px] sm:text-xs tracking-wider truncate">Monthly Value</CardDescription>
              <CardTitle className="text-xl sm:text-3xl font-black flex items-center justify-between">
                ₦{(items.reduce((acc, item) => acc + (item.stock_level * item.unit_price), 0)).toLocaleString()}
                <BarChart3 className="h-5 w-5 sm:h-8 sm:w-8 text-green-500 opacity-20 shrink-0" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
              <div className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1 truncate">
                <TrendingUp className="h-3 w-3 text-green-500 shrink-0" /> <span className="truncate">Current valuation</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50 p-1 grid grid-cols-2 md:inline-flex h-auto gap-1">
            <TabsTrigger value="items" className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm py-1.5 sm:py-1">
              <Box className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Stock Items</span>
            </TabsTrigger>
            <TabsTrigger value="categories" className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm py-1.5 sm:py-1">
              <Layers className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Categories</span>
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm py-1.5 sm:py-1">
              <Truck className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Suppliers</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm py-1.5 sm:py-1">
              <History className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
              <span className="truncate">Activity Log</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-4">
            <div className="flex flex-row gap-2 items-center justify-between w-full">
              <div className="relative flex-1 md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name or SKU..." 
                  className="pl-9 h-10"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center shrink-0">
                <Button variant="outline" className="flex items-center gap-2 h-10 shrink-0">
                  <Filter className="h-4 w-4" /> Filter
                </Button>
              </div>
            </div>

            <Card>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10">Loading inventory data...</TableCell>
                    </TableRow>
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10">No items found.</TableCell>
                    </TableRow>
                  ) : filteredItems.map((item) => (
                    <TableRow key={item.id} className="group">
                      <TableCell className="font-medium">
                        <div className="flex flex-col">
                          <span>{item.name}</span>
                          <span className="text-xs text-muted-foreground">{item.description}</span>
                        </div>
                      </TableCell>
                      <TableCell><code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">{item.sku || 'N/A'}</code></TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">{item.category_name || 'Uncategorized'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "font-bold",
                            item.stock_level <= item.min_stock_level ? "text-rose-600" : "text-green-600"
                          )}>
                            {item.stock_level} {item.unit}
                          </span>
                          {item.stock_level <= item.min_stock_level && (
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.location || 'Not Set'}</TableCell>
                      <TableCell>
                        {item.expiry_date ? (
                          <span className={cn(
                            "text-sm",
                            new Date(item.expiry_date) < new Date() ? "text-rose-600 font-bold" : ""
                          )}>
                            {format(new Date(item.expiry_date), 'MMM dd, yyyy')}
                          </span>
                        ) : 'No Expiry'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant="ghost" size="sm"><MoreVertical className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Item Actions</DropdownMenuLabel>
                            {hasPermission('adjust_stock') && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedItem(item);
                                  setIsAdjustStockOpen(true);
                                }}
                                className="text-blue-600 focus:text-blue-600"
                              >
                                <ArrowRightLeft className="h-4 w-4 mr-2" /> Adjust Stock
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => {
                              setEditingItem({...item});
                              setIsEditItemOpen(true);
                            }}>
                              <Edit className="h-4 w-4 mr-2" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={() => handleDeleteItem(item.id)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="categories">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Inventory Categories</CardTitle>
                  <CardDescription>Manage groupings for clinical items.</CardDescription>
                </div>
                <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
                  <DialogTrigger>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" /> Add Category
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Category</DialogTitle>
                      <DialogDescription>Create a new grouping for inventory items.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddCategory} className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="cat_name">Category Name</Label>
                        <Input id="cat_name" placeholder="e.g. Antibiotics" value={newCategory.name} onChange={e => setNewCategory({...newCategory, name: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cat_desc">Description</Label>
                        <Input id="cat_desc" placeholder="Items related to..." value={newCategory.description} onChange={e => setNewCategory({...newCategory, description: e.target.value})} />
                      </div>
                      <DialogFooter>
                        <Button type="submit">Create Category</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Category Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Items Count</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{c.description || 'No description'}</TableCell>
                      <TableCell>{items.filter(i => i.category_id === c.id).length} Items</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditingCategory({...c});
                          setIsEditCategoryOpen(true);
                        }}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => handleDeleteCategory(c.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Registered Suppliers</CardTitle>
                  <CardDescription>Vendors and clinical supply partners.</CardDescription>
                </div>
                <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
                  <DialogTrigger>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" /> Add Supplier
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add New Supplier</DialogTitle>
                      <DialogDescription>Register a vendor or supply partner.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddSupplier} className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="sup_name">Supplier Name</Label>
                        <Input id="sup_name" placeholder="e.g. Pfizer Global" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} required />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="sup_contact">Contact Person</Label>
                          <Input id="sup_contact" placeholder="John Doe" value={newSupplier.contact_person} onChange={e => setNewSupplier({...newSupplier, contact_person: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="sup_phone">Phone Number</Label>
                          <Input id="sup_phone" placeholder="+234..." value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sup_email">Email Address</Label>
                        <Input id="sup_email" type="email" placeholder="sales@supplier.com" value={newSupplier.email} onChange={e => setNewSupplier({...newSupplier, email: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sup_addr">Office Address</Label>
                        <Input id="sup_addr" placeholder="No. 12, Tech Plaza..." value={newSupplier.address} onChange={e => setNewSupplier({...newSupplier, address: e.target.value})} />
                      </div>
                      <DialogFooter>
                        <Button type="submit">Register Supplier</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>{s.contact_person}</TableCell>
                      <TableCell>
                        <div className="flex flex-col text-sm">
                          <span>{s.phone}</span>
                          <span className="text-muted-foreground">{s.email}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{s.address}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setEditingSupplier({...s});
                          setIsEditSupplierOpen(true);
                        }}>Edit</Button>
                        <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => handleDeleteSupplier(s.id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Stock movements and adjustment logs.</CardDescription>
              </CardHeader>
              <Table className="whitespace-nowrap">
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(t.timestamp), 'MMM dd, HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">{t.item_name}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={t.transaction_type === 'Addition' ? 'default' : t.transaction_type === 'Deduction' ? 'destructive' : 'outline'}
                          className="capitalize"
                        >
                          {t.transaction_type === 'Addition' ? (
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                          ) : t.transaction_type === 'Deduction' ? (
                            <ArrowDownRight className="h-3 w-3 mr-1" />
                          ) : (
                            <ArrowRightLeft className="h-3 w-3 mr-1" />
                          )}
                          {t.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">
                        {t.transaction_type === 'Addition' ? '+' : t.transaction_type === 'Deduction' ? '-' : ''}
                        {Math.abs(t.quantity)}
                      </TableCell>
                      <TableCell>{t.user_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Item Modal */}
        <Dialog open={isEditItemOpen} onOpenChange={setIsEditItemOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Inventory Item</DialogTitle>
              <DialogDescription>Update details for {editingItem?.name}.</DialogDescription>
            </DialogHeader>
            {editingItem && (
              <form onSubmit={handleUpdateItem} className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_name">Item Name</Label>
                  <Input id="edit_name" placeholder="e.g. Paracetamol 500mg" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_sku">SKU / Code</Label>
                  <div className="flex gap-2">
                    <Input id="edit_sku" placeholder="e.g. MED-001" value={editingItem.sku || ''} onChange={e => setEditingItem({...editingItem, sku: e.target.value})} className="flex-1" />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={() => { setScannerTarget('edit'); setIsScannerOpen(true); }}
                      className="shrink-0"
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={editingItem.category_id?.toString()} onValueChange={v => setEditingItem({...editingItem, category_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Select value={editingItem.supplier_id?.toString()} onValueChange={v => setEditingItem({...editingItem, supplier_id: v})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_unit">Unit</Label>
                  <Input id="edit_unit" placeholder="Packs" value={editingItem.unit || ''} onChange={e => setEditingItem({...editingItem, unit: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_min_stock">Reorder Level (Min)</Label>
                  <Input id="edit_min_stock" type="number" value={editingItem.min_stock_level} onChange={e => setEditingItem({...editingItem, min_stock_level: parseInt(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_price">Unit Price</Label>
                  <Input id="edit_price" type="number" step="0.01" value={editingItem.unit_price} onChange={e => setEditingItem({...editingItem, unit_price: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_expiry">Expiry Date</Label>
                  <Input id="edit_expiry" type="date" value={editingItem.expiry_date || ''} onChange={e => setEditingItem({...editingItem, expiry_date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_location">Storage Location</Label>
                  <Input id="edit_location" placeholder="Shelf A, Cabinet 3" value={editingItem.location || ''} onChange={e => setEditingItem({...editingItem, location: e.target.value})} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit_desc">Description</Label>
                  <Input id="edit_desc" placeholder="Brief description..." value={editingItem.description || ''} onChange={e => setEditingItem({...editingItem, description: e.target.value})} />
                </div>
                <DialogFooter className="col-span-2 mt-4">
                  <Button variant="outline" type="button" onClick={() => setIsEditItemOpen(false)}>Cancel</Button>
                  <Button type="submit">Update Item</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Category Modal */}
        <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>Update category details.</DialogDescription>
            </DialogHeader>
            {editingCategory && (
              <form onSubmit={handleUpdateCategory} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_cat_name">Category Name</Label>
                  <Input id="edit_cat_name" placeholder="e.g. Antibiotics" value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_cat_desc">Description</Label>
                  <Input id="edit_cat_desc" placeholder="Items related to..." value={editingCategory.description || ''} onChange={e => setEditingCategory({...editingCategory, description: e.target.value})} />
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setIsEditCategoryOpen(false)}>Cancel</Button>
                  <Button type="submit">Update Category</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Supplier Modal */}
        <Dialog open={isEditSupplierOpen} onOpenChange={setIsEditSupplierOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Supplier</DialogTitle>
              <DialogDescription>Update supplier contact details.</DialogDescription>
            </DialogHeader>
            {editingSupplier && (
              <form onSubmit={handleUpdateSupplier} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_sup_name">Supplier Name</Label>
                  <Input id="edit_sup_name" placeholder="e.g. Pfizer Global" value={editingSupplier.name} onChange={e => setEditingSupplier({...editingSupplier, name: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit_sup_contact">Contact Person</Label>
                    <Input id="edit_sup_contact" placeholder="John Doe" value={editingSupplier.contact_person || ''} onChange={e => setEditingSupplier({...editingSupplier, contact_person: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit_sup_phone">Phone Number</Label>
                    <Input id="edit_sup_phone" placeholder="+234..." value={editingSupplier.phone || ''} onChange={e => setEditingSupplier({...editingSupplier, phone: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_sup_email">Email Address</Label>
                  <Input id="edit_sup_email" type="email" placeholder="sales@supplier.com" value={editingSupplier.email || ''} onChange={e => setEditingSupplier({...editingSupplier, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_sup_addr">Office Address</Label>
                  <Input id="edit_sup_addr" placeholder="No. 12, Tech Plaza..." value={editingSupplier.address || ''} onChange={e => setEditingSupplier({...editingSupplier, address: e.target.value})} />
                </div>
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={() => setIsEditSupplierOpen(false)}>Cancel</Button>
                  <Button type="submit">Update Supplier</Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Adjust Stock Modal */}
        <Dialog open={isAdjustStockOpen} onOpenChange={setIsAdjustStockOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Stock: {selectedItem?.name}</DialogTitle>
              <DialogDescription>Manually update the current stock level.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Adjustment Type</Label>
                  <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Addition">Addition (Restock)</SelectItem>
                      <SelectItem value="Deduction">Deduction (Usage/Sale)</SelectItem>
                      <SelectItem value="Adjustment">Set Absolute Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input 
                    type="number" 
                    placeholder="Enter amount..." 
                    value={adjustmentQuantity}
                    onChange={e => setAdjustmentQuantity(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Reason / Note</Label>
                <Input 
                  placeholder="e.g. Weekly restock, Patient usage..." 
                  value={adjustmentReason}
                  onChange={e => setAdjustmentReason(e.target.value)}
                />
              </div>
              <div className="bg-muted p-3 rounded-lg flex items-center justify-between">
                <span className="text-sm">Current Stock: <span className="font-bold">{selectedItem?.stock_level}</span></span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Resulting Stock: <span className="font-bold text-primary">
                  {adjustmentType === 'Addition' ? (selectedItem?.stock_level + (parseInt(adjustmentQuantity) || 0)) : 
                   adjustmentType === 'Deduction' ? (selectedItem?.stock_level - (parseInt(adjustmentQuantity) || 0)) : 
                   (parseInt(adjustmentQuantity) || 0)}
                </span></span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAdjustStockOpen(false)}>Cancel</Button>
              <Button onClick={handleAdjustStock}>Confirm Adjustment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Fast Adjust Modal */}
        <Dialog open={isFastAdjustOpen} onOpenChange={setIsFastAdjustOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{adjustmentType === 'Addition' ? 'Restock Item' : 'Deduct Item'}</DialogTitle>
              <DialogDescription>Scan or type the SKU/Name to select an item, then enter the quantity.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2 relative">
                <Label>Search Item (SKU or Name)</Label>
                <div className="flex gap-2">
                  <Input 
                    autoFocus
                    placeholder="Scan barcode or type name..." 
                    value={fastAdjustSearchTerm}
                    onChange={e => {
                      setFastAdjustSearchTerm(e.target.value);
                      const match = items.find(i => i.sku && i.sku.toLowerCase() === e.target.value.toLowerCase());
                      if (match) {
                        setSelectedItem(match);
                      } else {
                        setSelectedItem(null);
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon" 
                    onClick={() => { setScannerTarget('fast_adjust'); setIsScannerOpen(true); }}
                    className="shrink-0"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
                
                {fastAdjustSearchTerm && !selectedItem && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-950 border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {items.filter(i => 
                      i.name.toLowerCase().includes(fastAdjustSearchTerm.toLowerCase()) || 
                      (i.sku && i.sku.toLowerCase().includes(fastAdjustSearchTerm.toLowerCase()))
                    ).map(item => (
                      <div 
                        key={item.id} 
                        className="px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex justify-between items-center"
                        onClick={() => {
                          setSelectedItem(item);
                          setFastAdjustSearchTerm(item.name);
                        }}
                      >
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground">{item.sku}</span>
                      </div>
                    ))}
                    {items.filter(i => 
                      i.name.toLowerCase().includes(fastAdjustSearchTerm.toLowerCase()) || 
                      (i.sku && i.sku.toLowerCase().includes(fastAdjustSearchTerm.toLowerCase()))
                    ).length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">No items found.</div>
                    )}
                  </div>
                )}
              </div>

              {selectedItem && (
                <>
                  <div className="bg-muted p-3 rounded-lg flex flex-col gap-1">
                    <span className="font-semibold text-lg">{selectedItem.name}</span>
                    <span className="text-sm text-muted-foreground">SKU: {selectedItem.sku || 'N/A'} | Category: {selectedItem.category_name}</span>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantity to {adjustmentType === 'Addition' ? 'Add' : 'Deduct'}</Label>
                    <Input 
                      type="number" 
                      placeholder="Enter amount..." 
                      value={adjustmentQuantity}
                      onChange={e => setAdjustmentQuantity(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Reason / Note</Label>
                    <Input 
                      placeholder={adjustmentType === 'Addition' ? "e.g. Weekly restock..." : "e.g. Patient usage..."} 
                      value={adjustmentReason}
                      onChange={e => setAdjustmentReason(e.target.value)}
                    />
                  </div>
                  <div className="bg-muted p-3 rounded-lg flex items-center justify-between">
                    <span className="text-sm">Current Stock: <span className="font-bold">{selectedItem.stock_level}</span></span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Resulting Stock: <span className="font-bold text-primary">
                      {adjustmentType === 'Addition' ? (selectedItem.stock_level + (parseInt(adjustmentQuantity) || 0)) : 
                       adjustmentType === 'Deduction' ? (selectedItem.stock_level - (parseInt(adjustmentQuantity) || 0)) : 
                       (parseInt(adjustmentQuantity) || 0)}
                    </span></span>
                  </div>
                </>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsFastAdjustOpen(false)}>Cancel</Button>
              <Button onClick={() => {
                handleAdjustStock();
              }} disabled={!selectedItem || !adjustmentQuantity}>Confirm {adjustmentType}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {isScannerOpen && (
          <BarcodeScanner 
            onScan={handleScan} 
            onClose={() => setIsScannerOpen(false)} 
          />
        )}
      </div>
    </MainLayout>
  );
};

export default InventoryPage;
