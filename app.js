// --- INITIALIZATION ---
lucide.createIcons();

// --- STATE MANAGEMENT (Mock Data) ---
let inventory = [
    { id: 1, date: '21/5', code: 'DX0132', unit: '1 LÍT', qty: 2, inPrice: 300000, outPrice: 500000, supplier: 'SƠN AN KHÁNH' }, // Tồn ít để test cảnh báo
    { id: 2, date: '21/5', code: 'DX5110', unit: '1 LÍT', qty: 5, inPrice: 400000, outPrice: 600000, supplier: 'SƠN AN KHÁNH' },
    { id: 3, date: '21/5', code: 'DX5132', unit: '1 LÍT', qty: 5, inPrice: 500000, outPrice: 700000, supplier: 'SƠN AN KHÁNH' },
    { id: 4, date: '21/5', code: 'DX5225', unit: '1 LÍT', qty: 5, inPrice: 600000, outPrice: 800000, supplier: 'SƠN AN KHÁNH' },
    { id: 5, date: '21/5', code: 'DX5226', unit: '1 LÍT', qty: 5, inPrice: 700000, outPrice: 900000, supplier: 'SƠN AN KHÁNH' },
    { id: 6, date: '21/5', code: 'DX44', unit: 'LOẠI 4 LÍT', qty: 5, inPrice: 1050000, outPrice: 1250000, supplier: 'SƠN AN KHÁNH' }
];

let orders = [
    { id: 'DH001', deliveryDate: '2026-05-22', customer: 'Gara Thành Đạt', shipping: 50000, total: 1100000, status: 'Hoàn thành' },
];

let expenses = [
    { id: 1, date: '21/5/2026', type: 'Cố định', desc: 'Tiền thuê mặt bằng tháng 5', amount: 15000000 },
];

let debts = [
    { id: 'CN001', date: '20/5/2026', partner: 'Gara Hưng Phát', type: 'Khách nợ', amount: 3500000, desc: 'Đơn DH000', status: 'Chưa thanh toán' }
];

// Current order being created
let currentOrderItems = [];

// --- FORMATTING UTILS ---
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const getTodayDate = () => {
    const today = new Date();
    return `${today.getDate()}/${today.getMonth() + 1}/${today.getFullYear()}`;
};
const getTodayDateISO = () => {
    return new Date().toISOString().split('T')[0];
};

// Preset today's date in order modal
document.getElementById('ord-date').value = getTodayDateISO();

// --- NAVIGATION LOGIC ---
const navItems = document.querySelectorAll('.nav-item');
const pageSections = document.querySelectorAll('.page-section');
const pageTitle = document.getElementById('page-title');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        // Update active nav
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        // Update page title
        pageTitle.textContent = item.textContent.trim();

        // Switch section
        const targetId = item.getAttribute('data-target');
        pageSections.forEach(section => {
            section.classList.remove('active');
            if (section.id === targetId) {
                section.classList.add('active');
            }
        });

        // Re-render specific sections if needed
        if (targetId === 'dashboard') renderDashboard();
    });
});


// --- DASHBOARD LOGIC ---
function renderDashboard() {
    let totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    
    // Total cost = Inventory Cost + Expenses
    let inventoryCost = inventory.reduce((sum, item) => sum + (item.qty * item.inPrice), 0);
    let totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    let totalCost = inventoryCost + totalExpense;

    let totalProfit = totalRevenue - totalCost;
    
    // Total Debts (Khách nợ - Nợ NCC)
    let totalDebt = debts.reduce((sum, d) => {
        if(d.type === 'Khách nợ' && d.status === 'Chưa thanh toán') return sum + d.amount;
        if(d.type === 'Nợ NCC' && d.status === 'Chưa thanh toán') return sum - d.amount;
        return sum;
    }, 0);

    document.getElementById('stat-revenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('stat-cost').textContent = formatCurrency(totalCost);
    document.getElementById('stat-profit').textContent = formatCurrency(totalProfit);
    document.getElementById('stat-profit').className = totalProfit >= 0 ? 'text-success' : 'text-danger';
    document.getElementById('stat-orders').textContent = orders.length;
    document.getElementById('stat-debts').textContent = formatCurrency(totalDebt);

    // Recent Transactions
    const recentList = document.getElementById('recent-transactions');
    recentList.innerHTML = '';
    
    const allTransactions = [
        ...orders.map(o => ({ type: 'Thu', desc: `Đơn hàng ${o.id} - ${o.customer}`, amount: o.total, date: o.date })),
        ...expenses.map(e => ({ type: 'Chi', desc: e.desc, amount: -e.amount, date: e.date }))
    ].sort((a,b) => 1); // Mock sorting

    allTransactions.slice(0, 5).forEach(t => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <span class="badge ${t.type === 'Thu' ? 'success' : 'danger'}">${t.type}</span>
                <span style="margin-left: 10px">${t.desc}</span>
            </div>
            <span class="${t.type === 'Thu' ? 'text-success' : 'text-danger'} font-semibold">
                ${t.type === 'Thu' ? '+' : ''}${formatCurrency(t.amount)}
            </span>
        `;
        recentList.appendChild(li);
    });

    // Low Stock Alerts
    const lowStockList = document.getElementById('low-stock-list');
    lowStockList.innerHTML = '';
    const lowStockItems = inventory.filter(i => i.qty <= 3); // Threshold for low stock warning
    
    if (lowStockItems.length === 0) {
        lowStockList.innerHTML = '<li class="text-muted">Không có mặt hàng nào sắp hết.</li>';
    } else {
        lowStockItems.forEach(item => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div>Mã <strong>${item.code}</strong> (${item.unit})</div>
                <span class="text-warning font-semibold">Còn ${item.qty}</span>
            `;
            lowStockList.appendChild(li);
        });
    }
}

// --- INVENTORY LOGIC ---
function renderInventory() {
    const tbody = document.getElementById('inventory-tbody');
    tbody.innerHTML = '';
    
    inventory.forEach(item => {
        const tr = document.createElement('tr');
        // Highlight row if stock is low
        if(item.qty <= 3) tr.className = 'row-warning';
        
        tr.innerHTML = `
            <td>${item.date}</td>
            <td class="font-semibold text-primary">${item.code}</td>
            <td>${item.unit}</td>
            <td class="${item.qty <= 3 ? 'text-warning font-bold' : ''}">${item.qty}</td>
            <td>${formatCurrency(item.inPrice)}</td>
            <td>${formatCurrency(item.outPrice)}</td>
            <td>${item.supplier}</td>
        `;
        tbody.appendChild(tr);
    });

    // Update order modal select
    updateOrderSelect();
}

function handleInventorySubmit(e) {
    e.preventDefault();
    const newItem = {
        id: Date.now(),
        date: getTodayDate(),
        code: document.getElementById('inv-code').value.toUpperCase(),
        unit: document.getElementById('inv-unit').value.toUpperCase(),
        qty: parseInt(document.getElementById('inv-qty').value),
        inPrice: parseInt(document.getElementById('inv-in-price').value),
        outPrice: parseInt(document.getElementById('inv-out-price').value),
        supplier: document.getElementById('inv-supplier').value.toUpperCase()
    };

    inventory.push(newItem);
    renderInventory();
    renderDashboard();
    closeModal('inventory-modal');
    e.target.reset();
}

// --- ORDER LOGIC ---
function renderOrders() {
    const tbody = document.getElementById('orders-tbody');
    tbody.innerHTML = '';
    
    orders.forEach(order => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="font-semibold">${order.id}</td>
            <td>${order.deliveryDate}</td>
            <td>${order.customer}</td>
            <td>${formatCurrency(order.shipping)}</td>
            <td class="text-success font-semibold">${formatCurrency(order.total)}</td>
            <td><span class="badge success">${order.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function updateOrderSelect() {
    const select = document.getElementById('ord-product-select');
    select.innerHTML = '<option value="">-- Chọn sản phẩm --</option>';
    inventory.forEach(item => {
        if(item.qty > 0) {
            select.innerHTML += `<option value="${item.code}">${item.code} - ${item.unit} (${formatCurrency(item.outPrice)}) - Tồn: ${item.qty}</option>`;
        }
    });
}

function addOrderItem() {
    const select = document.getElementById('ord-product-select');
    const qtyInput = document.getElementById('ord-qty');
    
    const code = select.value;
    const qty = parseInt(qtyInput.value);

    if(!code || qty < 1) return alert('Vui lòng chọn SP và số lượng hợp lệ');

    const product = inventory.find(i => i.code === code);
    if(qty > product.qty) return alert(`Không đủ tồn kho. Tồn hiện tại: ${product.qty}`);

    const existingItem = currentOrderItems.find(i => i.code === code);
    if(existingItem) {
        if(existingItem.qty + qty > product.qty) return alert('Tổng số lượng vượt tồn kho');
        existingItem.qty += qty;
    } else {
        currentOrderItems.push({
            code: product.code,
            name: `${product.code} - ${product.unit}`,
            price: product.outPrice,
            qty: qty
        });
    }

    renderOrderItems();
    qtyInput.value = 1;
    select.value = "";
}

function renderOrderItems() {
    const list = document.getElementById('ord-items-list');
    list.innerHTML = '';
    let productTotal = 0;

    currentOrderItems.forEach((item, index) => {
        productTotal += item.price * item.qty;
        const li = document.createElement('li');
        li.className = 'order-item';
        li.innerHTML = `
            <div>${item.name} <span class="text-muted">x${item.qty}</span></div>
            <div>
                ${formatCurrency(item.price * item.qty)}
                <i data-lucide="trash-2" style="cursor:pointer; color:var(--danger); width:16px; margin-left:10px" onclick="removeOrderItem(${index})"></i>
            </div>
        `;
        list.appendChild(li);
    });
    lucide.createIcons();
    
    // Thêm phí ship
    const shippingCost = parseInt(document.getElementById('ord-shipping').value) || 0;
    const totalAmount = productTotal + shippingCost;
    
    document.getElementById('ord-total-amount').textContent = formatCurrency(totalAmount);
}

window.removeOrderItem = function(index) {
    currentOrderItems.splice(index, 1);
    renderOrderItems();
}

function handleOrderSubmit(e) {
    e.preventDefault();
    if(currentOrderItems.length === 0) return alert('Vui lòng thêm ít nhất 1 sản phẩm');

    const customer = document.getElementById('ord-customer').value;
    const deliveryDate = document.getElementById('ord-date').value;
    const shipping = parseInt(document.getElementById('ord-shipping').value) || 0;
    const isDebt = document.getElementById('ord-debt-check').checked;
    
    const productTotal = currentOrderItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalAmount = productTotal + shipping;
    
    // Deduct inventory
    currentOrderItems.forEach(orderItem => {
        let invItem = inventory.find(i => i.code === orderItem.code);
        if(invItem) invItem.qty -= orderItem.qty;
    });

    const newOrderId = 'DH' + String(orders.length + 1).padStart(3, '0');
    
    const newOrder = {
        id: newOrderId,
        deliveryDate: deliveryDate,
        customer: customer,
        shipping: shipping,
        total: totalAmount,
        status: isDebt ? 'Chưa thanh toán' : 'Hoàn thành'
    };

    orders.push(newOrder);
    
    // Create debt if checked
    if(isDebt) {
        debts.push({
            id: 'CN' + String(debts.length + 1).padStart(3, '0'),
            date: getTodayDate(),
            partner: customer,
            type: 'Khách nợ',
            amount: totalAmount,
            desc: `Đơn hàng ${newOrderId}`,
            status: 'Chưa thanh toán'
        });
        renderDebts();
    }
    
    // Reset form
    currentOrderItems = [];
    e.target.reset();
    document.getElementById('ord-date').value = getTodayDateISO();
    renderOrderItems();
    closeModal('order-modal');
    
    // Refresh all views
    renderOrders();
    renderInventory();
    renderDashboard();
    
    // Check if any item is low stock and warn user
    const lowStockAlerts = inventory.filter(i => i.qty <= 3 && i.qty > 0);
    const outOfStockAlerts = inventory.filter(i => i.qty === 0);
    
    let alertMsg = 'Lên đơn hàng thành công!\n';
    if(outOfStockAlerts.length > 0) {
        alertMsg += `\n⚠️ CẢNH BÁO: Đã hết hàng: ${outOfStockAlerts.map(i=>i.code).join(', ')}`;
    }
    if(lowStockAlerts.length > 0) {
        alertMsg += `\n⚠️ Sắp hết hàng: ${lowStockAlerts.map(i=>i.code).join(', ')}`;
    }
    
    if(outOfStockAlerts.length > 0 || lowStockAlerts.length > 0) {
        alert(alertMsg);
    }
}

// --- DEBTS LOGIC ---
function renderDebts() {
    const tbody = document.getElementById('debts-tbody');
    tbody.innerHTML = '';
    
    debts.forEach(debt => {
        const tr = document.createElement('tr');
        const badgeColor = debt.type === 'Khách nợ' ? 'info' : 'warning';
        tr.innerHTML = `
            <td class="font-semibold">${debt.id}</td>
            <td>${debt.date}</td>
            <td>${debt.partner}</td>
            <td><span class="badge ${badgeColor}">${debt.type}</span></td>
            <td class="text-danger font-semibold">${formatCurrency(debt.amount)}</td>
            <td><span class="badge ${debt.status === 'Chưa thanh toán' ? 'danger' : 'success'}">${debt.status}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function handleDebtSubmit(e) {
    e.preventDefault();
    const newDebt = {
        id: 'CN' + String(debts.length + 1).padStart(3, '0'),
        date: getTodayDate(),
        partner: document.getElementById('debt-partner').value,
        type: document.getElementById('debt-type').value,
        amount: parseInt(document.getElementById('debt-amount').value),
        desc: document.getElementById('debt-desc').value,
        status: 'Chưa thanh toán'
    };

    debts.push(newDebt);
    renderDebts();
    renderDashboard();
    closeModal('debt-modal');
    e.target.reset();
}


// --- EXPENSES LOGIC ---
function renderExpenses() {
    const tbody = document.getElementById('expenses-tbody');
    tbody.innerHTML = '';
    
    expenses.forEach(exp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${exp.date}</td>
            <td><span class="badge ${exp.type === 'Cố định' ? 'warning' : 'danger'}">${exp.type}</span></td>
            <td>${exp.desc}</td>
            <td class="text-danger font-semibold">${formatCurrency(exp.amount)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function handleExpenseSubmit(e) {
    e.preventDefault();
    const newExpense = {
        id: Date.now(),
        date: getTodayDate(),
        type: document.getElementById('exp-type').value,
        desc: document.getElementById('exp-desc').value,
        amount: parseInt(document.getElementById('exp-amount').value)
    };

    expenses.push(newExpense);
    renderExpenses();
    renderDashboard();
    closeModal('expense-modal');
    e.target.reset();
}


// --- MODAL UTILS ---
window.openModal = function(id) {
    document.getElementById(id).classList.add('active');
}
window.closeModal = function(id) {
    document.getElementById(id).classList.remove('active');
}

// Close modal on outside click
document.querySelectorAll('.modal-overlay').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if(e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// --- INITIAL RENDER ---
renderInventory();
renderOrders();
renderDebts();
renderExpenses();
renderDashboard();
