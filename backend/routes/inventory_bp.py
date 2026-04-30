from flask import Blueprint, request, jsonify
from models import db, InventoryCategory, InventorySupplier, InventoryItem, InventoryTransaction, User
from decorators import require_permission
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import json

inventory_bp = Blueprint('inventory_bp', __name__)

# Categories
@inventory_bp.route('/categories', methods=['GET'])
@require_permission('view_inventory')
def get_categories():
    categories = InventoryCategory.query.order_by(InventoryCategory.name).all()
    return jsonify([c.to_dict() for c in categories]), 200

@inventory_bp.route('/categories', methods=['POST'])
@require_permission('manage_inventory')
def add_category():
    data = request.json
    name = data.get('name')
    if not name:
        return jsonify({"error": "Category name is required"}), 400
    
    if InventoryCategory.query.filter_by(name=name).first():
        return jsonify({"error": "Category already exists"}), 400
    
    cat = InventoryCategory(name=name, description=data.get('description'))
    db.session.add(cat)
    db.session.commit()
    return jsonify(cat.to_dict()), 201

@inventory_bp.route('/categories/<int:cat_id>', methods=['DELETE'])
@require_permission('manage_inventory')
def delete_category(cat_id):
    cat = InventoryCategory.query.get(cat_id)
    if not cat:
        return jsonify({"error": "Category not found"}), 404
    
    # Check if category is used by items
    if InventoryItem.query.filter_by(category_id=cat_id).first():
        return jsonify({"error": "Cannot delete category as it is currently assigned to items"}), 400
        
    db.session.delete(cat)
    db.session.commit()
    return jsonify({"message": "Category deleted successfully"}), 200

@inventory_bp.route('/categories/<int:cat_id>', methods=['PUT'])
@require_permission('manage_inventory')
def update_category(cat_id):
    cat = InventoryCategory.query.get(cat_id)
    if not cat:
        return jsonify({"error": "Category not found"}), 404
    
    data = request.json
    cat.name = data.get('name', cat.name)
    cat.description = data.get('description', cat.description)
    db.session.commit()
    return jsonify(cat.to_dict()), 200

# Suppliers
@inventory_bp.route('/suppliers', methods=['GET'])
@require_permission('view_inventory')
def get_suppliers():
    suppliers = InventorySupplier.query.order_by(InventorySupplier.name).all()
    return jsonify([s.to_dict() for s in suppliers]), 200

@inventory_bp.route('/suppliers', methods=['POST'])
@require_permission('manage_inventory')
def add_supplier():
    data = request.json
    name = data.get('name')
    if not name:
        return jsonify({"error": "Supplier name is required"}), 400
    
    supplier = InventorySupplier(
        name=name,
        contact_person=data.get('contact_person'),
        email=data.get('email'),
        phone=data.get('phone'),
        address=data.get('address')
    )
    db.session.add(supplier)
    db.session.commit()
    return jsonify(supplier.to_dict()), 201

@inventory_bp.route('/suppliers/<int:sup_id>', methods=['DELETE'])
@require_permission('manage_inventory')
def delete_supplier(sup_id):
    supplier = InventorySupplier.query.get(sup_id)
    if not supplier:
        return jsonify({"error": "Supplier not found"}), 404
    
    # Check if supplier is used by items
    if InventoryItem.query.filter_by(supplier_id=sup_id).first():
        return jsonify({"error": "Cannot delete supplier as it is currently assigned to items"}), 400

    db.session.delete(supplier)
    db.session.commit()
    return jsonify({"message": "Supplier deleted successfully"}), 200

@inventory_bp.route('/suppliers/<int:sup_id>', methods=['PUT'])
@require_permission('manage_inventory')
def update_supplier(sup_id):
    supplier = InventorySupplier.query.get(sup_id)
    if not supplier:
        return jsonify({"error": "Supplier not found"}), 404
    
    data = request.json
    supplier.name = data.get('name', supplier.name)
    supplier.contact_person = data.get('contact_person', supplier.contact_person)
    supplier.email = data.get('email', supplier.email)
    supplier.phone = data.get('phone', supplier.phone)
    supplier.address = data.get('address', supplier.address)
    db.session.commit()
    return jsonify(supplier.to_dict()), 200

# Items
@inventory_bp.route('/items', methods=['GET'])
@require_permission('view_inventory')
def get_items():
    items = InventoryItem.query.all()
    return jsonify([i.to_dict() for i in items]), 200

@inventory_bp.route('/items', methods=['POST'])
@require_permission('manage_inventory')
def add_item():
    data = request.json
    name = data.get('name')
    if not name:
        return jsonify({"error": "Item name is required"}), 400
    
    sku = data.get('sku')
    if sku and str(sku).strip() == "":
        sku = None
        
    if sku and InventoryItem.query.filter_by(sku=sku).first():
        return jsonify({"error": "Item with this SKU already exists"}), 400

    expiry_date = None
    if data.get('expiry_date'):
        try:
            expiry_date = datetime.strptime(data.get('expiry_date'), '%Y-%m-%d').date()
        except ValueError:
            pass

    # Sanitize IDs to handle empty strings from frontend
    cat_id = data.get('category_id')
    cat_id = int(cat_id) if cat_id and str(cat_id).strip() != "" else None
    
    sup_id = data.get('supplier_id')
    sup_id = int(sup_id) if sup_id and str(sup_id).strip() != "" else None

    item = InventoryItem(
        name=name,
        sku=sku,
        category_id=cat_id,
        supplier_id=sup_id,
        description=data.get('description'),
        unit=data.get('unit'),
        stock_level=data.get('stock_level', 0),
        min_stock_level=data.get('min_stock_level', 5),
        unit_price=data.get('unit_price', 0.0),
        expiry_date=expiry_date,
        location=data.get('location')
    )
    db.session.add(item)
    db.session.commit()
    
    # Log initial stock as transaction
    if item.stock_level > 0:
        user_id = get_jwt_identity()
        transaction = InventoryTransaction(
            item_id=item.id,
            user_id=user_id,
            transaction_type='Addition',
            quantity=item.stock_level,
            reason='Initial stock setup'
        )
        db.session.add(transaction)
        db.session.commit()
        
    return jsonify(item.to_dict()), 201

@inventory_bp.route('/items/<int:item_id>', methods=['PUT'])
@require_permission('manage_inventory')
def update_item(item_id):
    item = InventoryItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404
    
    data = request.json
    item.name = data.get('name', item.name)
    
    new_sku = data.get('sku')
    if new_sku and str(new_sku).strip() == "":
        new_sku = None
        
    if new_sku and new_sku != item.sku:
        if InventoryItem.query.filter_by(sku=new_sku).first():
            return jsonify({"error": "Item with this SKU already exists"}), 400
        item.sku = new_sku
        
    cat_id = data.get('category_id', item.category_id)
    item.category_id = int(cat_id) if cat_id and str(cat_id).strip() != "" else None
    
    sup_id = data.get('supplier_id', item.supplier_id)
    item.supplier_id = int(sup_id) if sup_id and str(sup_id).strip() != "" else None

    item.description = data.get('description', item.description)
    item.unit = data.get('unit', item.unit)
    item.min_stock_level = data.get('min_stock_level', item.min_stock_level)
    item.unit_price = data.get('unit_price', item.unit_price)
    item.location = data.get('location', item.location)
    
    if data.get('expiry_date'):
        try:
            item.expiry_date = datetime.strptime(data.get('expiry_date'), '%Y-%m-%d').date()
        except ValueError:
            pass
            
    db.session.commit()
    return jsonify(item.to_dict()), 200

@inventory_bp.route('/items/<int:item_id>', methods=['DELETE'])
@require_permission('manage_inventory')
def delete_item(item_id):
    item = InventoryItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404
    
    # Delete related transactions first or just delete item
    # Since they are linked by FK, we might need to handle this
    InventoryTransaction.query.filter_by(item_id=item_id).delete()
    
    db.session.delete(item)
    db.session.commit()
    return jsonify({"message": "Item deleted successfully"}), 200

# Stock Adjustments
@inventory_bp.route('/items/<int:item_id>/adjust', methods=['POST'])
@require_permission('adjust_stock')
def adjust_stock(item_id):
    item = InventoryItem.query.get(item_id)
    if not item:
        return jsonify({"error": "Item not found"}), 404
    
    data = request.json
    quantity = data.get('quantity')
    transaction_type = data.get('transaction_type') # 'Addition', 'Deduction', 'Adjustment'
    reason = data.get('reason')
    user_id = get_jwt_identity()
    
    if quantity is None or not transaction_type:
        return jsonify({"error": "Quantity and transaction type are required"}), 400
    
    old_stock = item.stock_level
    if transaction_type == 'Addition':
        item.stock_level += quantity
    elif transaction_type == 'Deduction':
        item.stock_level -= quantity
    elif transaction_type == 'Adjustment':
        item.stock_level = quantity
    
    transaction = InventoryTransaction(
        item_id=item.id,
        user_id=user_id,
        transaction_type=transaction_type,
        quantity=quantity if transaction_type != 'Adjustment' else (item.stock_level - old_stock),
        reason=reason
    )
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify({
        "message": "Stock adjusted successfully", 
        "new_stock_level": item.stock_level,
        "transaction": transaction.to_dict()
    }), 200

# Transactions
@inventory_bp.route('/transactions', methods=['GET'])
@require_permission('view_inventory') # Anyone who can view inventory can see logs
def get_transactions():
    item_id = request.args.get('item_id')
    if item_id:
        transactions = InventoryTransaction.query.filter_by(item_id=item_id).order_by(InventoryTransaction.timestamp.desc()).all()
    else:
        transactions = InventoryTransaction.query.order_by(InventoryTransaction.timestamp.desc()).limit(200).all()
    
    return jsonify([t.to_dict() for t in transactions]), 200
