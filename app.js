// --- INITIALIZATION ---
lucide.createIcons();

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBCRiv_RnxDtqxGuv_LrqMyL84pxok2Lro",
  authDomain: "carpainpro.firebaseapp.com",
  projectId: "carpainpro",
  storageBucket: "carpainpro.firebasestorage.app",
  messagingSenderId: "51391096074",
  appId: "1:51391096074:web:411fe7fab73187eda406f3"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// --- STATE MANAGEMENT ---
let inventory = [];
let orders = [];
let purchaseOrders = [];
let expenses = [];
let debts = [];

let currentOrderItems = [];
let currentPurchaseItems = [];

// Trạng thái khi ấn nút Sửa
let editingContext = {
    collection: null,
    docId: null,
    oldData: null
};

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

document.getElementById('ord-date').value = getTodayDateISO();
document.getElementById('pur-date').value = getTodayDateISO();

// --- NAVIGATION LOGIC ---
const navItems = document.querySelectorAll('.nav-item');
const pageSections = document.querySelectorAll('.page-section');
const pageTitle = document.getElementById('page-title');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        pageTitle.textContent = item.textContent.trim();

        const targetId = item.getAttribute('data-target');
        pageSections.forEach(section => {
            section.classList.remove('active');
            if (section.id === targetId) {
                section.classList.add('active');
            }
        });
    });
});

// --- GLOBAL ACTIONS ---
window.deleteItem = async function(collection, docId) {
    if(confirm('Bạn có chắc chắn muốn xóa bản ghi này? LƯU Ý: Xóa sẽ KHÔNG tự động hoàn lại Tồn kho hay Công nợ!')) {
        try {
            await db.collection(collection).doc(docId).delete();
        } catch (e) {
            console.error("Lỗi khi xóa: ", e);
            alert("Có lỗi xảy ra khi xóa!");
        }
    }
}

window.openEditModal = function(collection, docId) {
    editingContext.collection = collection;
    editingContext.docId = docId;
    
    if(collection === 'inventory') {
        const item = inventory.find(i => i.docId === docId);
        editingContext.oldData = item;
        document.getElementById('inv-name').value = item.name || '';
        document.getElementById('inv-code').value = item.code;
        document.getElementById('inv-code').setAttribute('readonly', true);
        document.getElementById('inv-unit').value = item.unit;
        document.getElementById('inv-qty').value = item.qty;
        document.getElementById('inv-in-price').value = item.inPrice;
        document.getElementById('inv-out-price').value = item.outPrice;
        document.getElementById('inv-supplier').value = item.supplier;
        
        document.getElementById('inventory-modal').querySelector('h2').textContent = 'Sửa vật tư';
        document.getElementById('inventory-form').querySelector('button[type="submit"]').textContent = 'Cập nhật';
        openModal('inventory-modal');
    }
    else if(collection === 'expenses') {
        const item = expenses.find(i => i.docId === docId);
        editingContext.oldData = item;
        document.getElementById('exp-type').value = item.type;
        document.getElementById('exp-desc').value = item.desc;
        document.getElementById('exp-amount').value = item.amount;
        
        document.getElementById('expense-modal').querySelector('h2').textContent = 'Sửa chi phí';
        document.getElementById('expense-form').querySelector('button[type="submit"]').textContent = 'Cập nhật';
        openModal('expense-modal');
    }
    else if(collection === 'debts') {
        const item = debts.find(i => i.docId === docId);
        editingContext.oldData = item;
        document.getElementById('debt-type').value = item.type;
        document.getElementById('debt-partner').value = item.partner;
        document.getElementById('debt-amount').value = item.amount;
        document.getElementById('debt-desc').value = item.desc;
        
        document.getElementById('debt-modal').querySelector('h2').textContent = 'Sửa công nợ';
        document.getElementById('debt-form').querySelector('button[type="submit"]').textContent = 'Cập nhật';
        openModal('debt-modal');
    }
    else if(collection === 'orders') {
        const item = orders.find(i => i.docId === docId);
        editingContext.oldData = item;
        
        document.getElementById('ord-id').value = item.id;
        document.getElementById('ord-customer').value = item.customer;
        document.getElementById('ord-date').value = item.deliveryDate;
        document.getElementById('ord-phone').value = item.phone || '';
        document.getElementById('ord-address').value = item.address || '';
        document.getElementById('ord-shipping').value = item.shipping || 0;
        document.getElementById('ord-debt-check').checked = item.status === 'Chưa thanh toán';
        
        currentOrderItems = JSON.parse(JSON.stringify(item.items || []));
        renderOrderItems();
        
        document.getElementById('order-modal').querySelector('h2').textContent = 'Sửa Đơn Bán Hàng';
        document.getElementById('order-form').querySelector('button[type="submit"]').textContent = 'Cập nhật Đơn hàng';
        openModal('order-modal');
    }
    else if(collection === 'purchaseOrders') {
        const item = purchaseOrders.find(i => i.docId === docId);
        editingContext.oldData = item;
        
        document.getElementById('pur-id').value = item.id;
        document.getElementById('pur-supplier').value = item.supplier;
        document.getElementById('pur-date').value = item.date;
        
        currentPurchaseItems = JSON.parse(JSON.stringify(item.items || []));
        renderPurchaseItems();
        
        document.getElementById('purchase-modal').querySelector('h2').textContent = 'Sửa Đơn Nhập Hàng';
        document.getElementById('purchase-form').querySelector('button[type="submit"]').textContent = 'Cập nhật Đơn hàng';
        openModal('purchase-modal');
    }
}

// Reset form UI on close
window.resetFormUI = function(modalId) {
    editingContext = { collection: null, docId: null, oldData: null };
    const modal = document.getElementById(modalId);
    
    if(modalId === 'inventory-modal') {
        modal.querySelector('h2').textContent = 'Khai báo vật tư mới';
        modal.querySelector('button[type="submit"]').textContent = 'Lưu vật tư';
        document.getElementById('inventory-form').reset();
        document.getElementById('inv-code').setAttribute('readonly', true);
    }
    else if(modalId === 'expense-modal') {
        modal.querySelector('h2').textContent = 'Thêm khoản chi phí';
        modal.querySelector('button[type="submit"]').textContent = 'Ghi nhận';
        document.getElementById('expense-form').reset();
    }
    else if(modalId === 'debt-modal') {
        modal.querySelector('h2').textContent = 'Thêm công nợ';
        modal.querySelector('button[type="submit"]').textContent = 'Ghi nhận công nợ';
        document.getElementById('debt-form').reset();
    }
    else if(modalId === 'order-modal') {
        modal.querySelector('h2').textContent = 'Tạo đơn bán hàng';
        modal.querySelector('button[type="submit"]').textContent = 'Lưu đơn bán hàng';
        document.getElementById('order-form').reset();
        currentOrderItems = [];
        renderOrderItems();
        document.getElementById('ord-date').value = getTodayDateISO();
    }
    else if(modalId === 'purchase-modal') {
        modal.querySelector('h2').textContent = 'Tạo Đơn Đặt Hàng NCC';
        modal.querySelector('button[type="submit"]').textContent = 'Lưu đơn đặt hàng';
        document.getElementById('purchase-form').reset();
        currentPurchaseItems = [];
        renderPurchaseItems();
        document.getElementById('pur-date').value = getTodayDateISO();
    }
}


// --- DASHBOARD LOGIC ---
function renderDashboard() {
    let totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    
    let inventoryCost = inventory.reduce((sum, item) => sum + (item.qty * item.inPrice), 0);
    let totalExpense = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    let totalCost = inventoryCost + totalExpense;

    let totalProfit = totalRevenue - totalCost;
    
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

    const recentList = document.getElementById('recent-transactions');
    recentList.innerHTML = '';
    
    const allTransactions = [
        ...orders.map(o => ({ type: 'Thu', desc: `Bán: ${o.id} - ${o.customer}`, amount: o.total, date: o.date, ts: o.timestamp })),
        ...expenses.map(e => ({ type: 'Chi', desc: `Chi phí: ${e.desc}`, amount: -e.amount, date: e.date, ts: e.timestamp })),
        ...purchaseOrders.filter(p => p.status === 'Đã nhận hàng').map(p => ({ type: 'Chi', desc: `Nhập: ${p.id} - ${p.supplier}`, amount: -p.total, date: p.date, ts: p.timestamp }))
    ].sort((a,b) => (b.ts || 0) - (a.ts || 0));

    allTransactions.slice(0, 5).forEach(t => {
        const li = document.createElement('li');
        li.innerHTML = `
            <div>
                <span class="badge ${t.type === 'Thu' ? 'success' : 'danger'}">${t.type}</span>
                <span style="margin-left: 10px">${t.desc}</span>
            </div>
            <span class="${t.type === 'Thu' ? 'text-success' : 'text-danger'} font-semibold">
                ${t.type === 'Thu' ? '+' : ''}${formatCurrency(Math.abs(t.amount))}
            </span>
        `;
        recentList.appendChild(li);
    });

    const lowStockList = document.getElementById('low-stock-list');
    lowStockList.innerHTML = '';
    const lowStockItems = inventory.filter(i => i.qty <= 3); 
    
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

// --- FIREBASE LISTENERS ---
db.collection("inventory").onSnapshot((snapshot) => {
    inventory = [];
    snapshot.forEach(doc => inventory.push({ docId: doc.id, ...doc.data() }));
    renderInventory();
    renderDashboard();
    updateOrderSelect();
    updatePurchaseSelect();
    updateSupplierList();
});

db.collection("orders").onSnapshot((snapshot) => {
    orders = [];
    snapshot.forEach(doc => orders.push({ docId: doc.id, ...doc.data() }));
    renderOrders();
    renderDashboard();
    updateCustomerList();
});

db.collection("purchaseOrders").onSnapshot((snapshot) => {
    purchaseOrders = [];
    snapshot.forEach(doc => purchaseOrders.push({ docId: doc.id, ...doc.data() }));
    renderPurchaseOrders();
    renderDashboard();
    updateSupplierList();
});

db.collection("debts").onSnapshot((snapshot) => {
    debts = [];
    snapshot.forEach(doc => debts.push({ docId: doc.id, ...doc.data() }));
    renderDebts();
    renderDashboard();
});

db.collection("expenses").onSnapshot((snapshot) => {
    expenses = [];
    snapshot.forEach(doc => expenses.push({ docId: doc.id, ...doc.data() }));
    renderExpenses();
    renderDashboard();
});


// --- INVENTORY LOGIC ---
window.generateProductCode = function() {
    if(editingContext.docId) return; 
    const name = document.getElementById('inv-name').value.trim();
    if(!name) { document.getElementById('inv-code').value = ''; return; }
    
    let codePrefix = name.split(' ').filter(w => w.length > 0).map(w => w.charAt(0).toUpperCase()).join('').substring(0, 4);
    let count = inventory.filter(i => i.code && i.code.startsWith(codePrefix)).length + 1;
    document.getElementById('inv-code').value = codePrefix + String(count).padStart(2, '0');
}

function renderInventory() {
    const tbody = document.getElementById('inventory-tbody');
    tbody.innerHTML = '';
    
    inventory.forEach(item => {
        const tr = document.createElement('tr');
        if(item.qty <= 3) tr.className = 'row-warning';
        
        tr.innerHTML = `
            <td class="font-semibold text-primary">${item.code}</td>
            <td class="font-semibold">${item.name || ''}</td>
            <td>${item.unit}</td>
            <td class="${item.qty <= 3 ? 'text-warning font-bold' : ''}">${item.qty}</td>
            <td>${formatCurrency(item.inPrice)}</td>
            <td>${formatCurrency(item.outPrice)}</td>
            <td>${item.supplier}</td>
            <td>
                <button class="btn-icon" style="color:var(--info)" onclick="openEditModal('inventory', '${item.docId}')"><i data-lucide="edit-2" style="width:18px"></i></button>
                <button class="btn-icon delete" onclick="deleteItem('inventory', '${item.docId}')"><i data-lucide="trash-2" style="width:18px"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

window.handleInventorySubmit = async function(e) {
    e.preventDefault();
    const newCode = document.getElementById('inv-code').value.toUpperCase().trim();
    const newName = document.getElementById('inv-name').value.trim();
    
    if(!editingContext.docId) {
        if(inventory.find(i => i.code === newCode)) {
            return alert('Lỗi: Mã sản phẩm này đã tồn tại!');
        }
        if(inventory.find(i => i.name && i.name.toUpperCase() === newName.toUpperCase())) {
            if(!confirm('Cảnh báo: Tên sản phẩm này có vẻ đã tồn tại trong kho! Bạn có chắc muốn tạo mã mới?')) return;
        }
    }

    const data = {
        code: newCode,
        name: newName,
        unit: document.getElementById('inv-unit').value.toUpperCase(),
        qty: parseInt(document.getElementById('inv-qty').value) || 0,
        inPrice: parseInt(document.getElementById('inv-in-price').value),
        outPrice: parseInt(document.getElementById('inv-out-price').value),
        supplier: document.getElementById('inv-supplier').value.toUpperCase(),
        timestamp: Date.now()
    };

    if(editingContext.docId) {
        await db.collection('inventory').doc(editingContext.docId).update(data).catch(e => alert("Lỗi: " + e.message));
    } else {
        await db.collection('inventory').add(data).catch(e => alert("Lỗi: " + e.message));
    }
    
    closeModal('inventory-modal');
}


// --- EXPENSES LOGIC ---
function renderExpenses() {
    const tbody = document.getElementById('expenses-tbody');
    tbody.innerHTML = '';
    expenses.forEach(exp => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${exp.date}</td>
            <td><span class="badge ${exp.type === 'Cố định' ? 'warning' : 'info'}">${exp.type}</span></td>
            <td>${exp.desc}</td>
            <td class="text-danger font-semibold">${formatCurrency(exp.amount)}</td>
            <td>
                <button class="btn-icon" style="color:var(--info)" onclick="openEditModal('expenses', '${exp.docId}')"><i data-lucide="edit-2" style="width:18px"></i></button>
                <button class="btn-icon delete" onclick="deleteItem('expenses', '${exp.docId}')"><i data-lucide="trash-2" style="width:18px"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

window.handleExpenseSubmit = async function(e) {
    e.preventDefault();
    const data = {
        date: getTodayDate(),
        type: document.getElementById('exp-type').value,
        desc: document.getElementById('exp-desc').value,
        amount: parseInt(document.getElementById('exp-amount').value),
        timestamp: Date.now()
    };

    if(editingContext.docId) {
        await db.collection('expenses').doc(editingContext.docId).update(data);
    } else {
        await db.collection('expenses').add(data);
    }
    closeModal('expense-modal');
}

// --- DEBTS LOGIC ---
function renderDebts() {
    const tbody = document.getElementById('debts-tbody');
    tbody.innerHTML = '';
    debts.forEach(debt => {
        const tr = document.createElement('tr');
        const typeBadgeColor = debt.type === 'Khách nợ' ? 'info' : 'warning';
        const statusBadgeColor = debt.status === 'Chưa thanh toán' ? 'danger' : 'success';
        tr.innerHTML = `
            <td class="font-semibold">${debt.id}</td>
            <td>${debt.date}</td>
            <td>${debt.partner}</td>
            <td><span class="badge ${typeBadgeColor}">${debt.type}</span></td>
            <td class="text-danger font-semibold">${formatCurrency(debt.amount)}</td>
            <td><span class="badge ${statusBadgeColor} clickable" onclick="toggleDebtStatus('${debt.docId}', '${debt.status}')">${debt.status}</span></td>
            <td>
                <button class="btn-icon" style="color:var(--info)" onclick="openEditModal('debts', '${debt.docId}')"><i data-lucide="edit-2" style="width:18px"></i></button>
                <button class="btn-icon delete" onclick="deleteItem('debts', '${debt.docId}')"><i data-lucide="trash-2" style="width:18px"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

window.toggleDebtStatus = async function(docId, currentStatus) {
    const newStatus = currentStatus === 'Chưa thanh toán' ? 'Đã thanh toán' : 'Chưa thanh toán';
    await db.collection('debts').doc(docId).update({ status: newStatus });
}

window.handleDebtSubmit = async function(e) {
    e.preventDefault();
    const data = {
        date: getTodayDate(),
        partner: document.getElementById('debt-partner').value,
        type: document.getElementById('debt-type').value,
        amount: parseInt(document.getElementById('debt-amount').value),
        desc: document.getElementById('debt-desc').value,
        timestamp: Date.now()
    };
    
    if(!editingContext.docId) {
        data.id = 'CN' + String(debts.length + 1).padStart(3, '0');
        data.status = 'Chưa thanh toán';
        await db.collection('debts').add(data);
    } else {
        await db.collection('debts').doc(editingContext.docId).update(data);
    }
    closeModal('debt-modal');
}


// --- PURCHASE ORDERS LOGIC ---
function renderPurchaseOrders() {
    const tbody = document.getElementById('purchase-tbody');
    tbody.innerHTML = '';
    purchaseOrders.forEach(order => {
        const tr = document.createElement('tr');
        let statusBadge = order.status === 'Đang chờ' 
            ? `<span class="badge warning clickable" onclick="togglePurchaseStatus('${order.docId}', '${order.status}', '${escape(JSON.stringify(order))}')">Đang chờ (Click để Nhận)</span>` 
            : `<span class="badge success">Đã nhận hàng</span>`;

        tr.innerHTML = `
            <td class="font-semibold">${order.id}</td>
            <td>${order.date}</td>
            <td>${order.supplier}</td>
            <td class="text-danger font-semibold">${formatCurrency(order.total)}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn-icon" style="color:var(--info)" onclick="openEditModal('purchaseOrders', '${order.docId}')"><i data-lucide="edit-2" style="width:18px"></i></button>
                <button class="btn-icon delete" onclick="deleteItem('purchaseOrders', '${order.docId}')"><i data-lucide="trash-2" style="width:18px"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function updateSupplierList() {
    const list = document.getElementById('supplier-list');
    if(!list) return;
    let suppliers = new Set();
    inventory.forEach(i => { if(i.supplier) suppliers.add(i.supplier); });
    purchaseOrders.forEach(p => { if(p.supplier) suppliers.add(p.supplier); });
    list.innerHTML = '';
    suppliers.forEach(s => {
        list.innerHTML += `<option value="${s}">`;
    });
}

function updatePurchaseSelect() {
    const dataList = document.getElementById('inventory-list-all');
    if(!dataList) return;
    dataList.innerHTML = '';
    inventory.forEach(item => {
        dataList.innerHTML += `<option value="${item.code} - ${item.name || ''}">Tồn kho: ${item.qty} ${item.unit}</option>`;
    });
}

window.fillPurchasePrice = function() {
    let inputValue = document.getElementById('pur-product-select').value;
    const priceInput = document.getElementById('pur-item-price');
    if(!inputValue) { priceInput.value = ''; return; }
    
    inputValue = inputValue.split(' - ')[0].trim().toUpperCase();
    const product = inventory.find(i => i.code === inputValue || (i.name && i.name.toUpperCase() === inputValue));
    if(product) priceInput.value = product.inPrice;
}

window.addPurchaseItem = function() {
    const select = document.getElementById('pur-product-select');
    const priceInput = document.getElementById('pur-item-price');
    const qtyInput = document.getElementById('pur-qty');
    
    let inputValue = select.value.split(' - ')[0].trim().toUpperCase();
    const price = parseInt(priceInput.value);
    const qty = parseInt(qtyInput.value);

    if(!inputValue || qty < 1 || isNaN(price)) return alert('Vui lòng chọn SP, giá và số lượng hợp lệ');

    let product = inventory.find(i => i.code === inputValue || (i.name && i.name.toUpperCase() === inputValue));
    if(!product) return alert('Sản phẩm chưa có trong kho!');
    
    const code = product.code;
    const existingItem = currentPurchaseItems.find(i => i.code === code);
    if(existingItem) {
        existingItem.qty += qty;
        existingItem.price = price;
    } else {
        currentPurchaseItems.push({ code: product.code, name: product.name ? `${product.code} - ${product.name}` : `${product.code} - ${product.unit}`, price: price, qty: qty });
    }
    renderPurchaseItems();
    qtyInput.value = 1; select.value = ""; priceInput.value = "";
}

window.renderPurchaseItems = function() {
    const list = document.getElementById('pur-items-list');
    list.innerHTML = '';
    let total = 0;
    currentPurchaseItems.forEach((item, index) => {
        total += item.price * item.qty;
        const li = document.createElement('li');
        li.className = 'order-item';
        li.innerHTML = `
            <div>${item.name} <span class="text-muted">x${item.qty} (${formatCurrency(item.price)})</span></div>
            <div>${formatCurrency(item.price * item.qty)} <i data-lucide="trash-2" style="cursor:pointer; color:var(--danger); width:16px; margin-left:10px" onclick="removePurchaseItem(${index})"></i></div>
        `;
        list.appendChild(li);
    });
    lucide.createIcons();
    document.getElementById('pur-total-amount').textContent = formatCurrency(total);
}

window.removePurchaseItem = function(index) {
    currentPurchaseItems.splice(index, 1);
    renderPurchaseItems();
}

window.handlePurchaseSubmit = async function(e) {
    e.preventDefault();
    if(currentPurchaseItems.length === 0) return alert('Vui lòng thêm ít nhất 1 sản phẩm');

    const supplier = document.getElementById('pur-supplier').value;
    const date = document.getElementById('pur-date').value;
    let customId = document.getElementById('pur-id').value;
    const totalAmount = currentPurchaseItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    
    if(editingContext.docId) {
        const oldOrder = editingContext.oldData;
        const data = { date, supplier, items: currentPurchaseItems, total: totalAmount };
        if(customId) data.id = customId;
        
        // AUTO-DIFF INVENTORY logic if it was already received
        if(oldOrder.status === 'Đã nhận hàng') {
            const oldItems = oldOrder.items || [];
            // Revert old items
            for(let oldItem of oldItems) {
                let invItem = inventory.find(i => i.code === oldItem.code);
                if(invItem) await db.collection('inventory').doc(invItem.docId).update({ qty: invItem.qty - oldItem.qty });
            }
            // Apply new items (refetch inventory in real scenario, but simplified here)
            for(let newItem of currentPurchaseItems) {
                let invDoc = await db.collection('inventory').where('code', '==', newItem.code).get();
                if(!invDoc.empty) {
                    let idoc = invDoc.docs[0];
                    await db.collection('inventory').doc(idoc.id).update({ qty: idoc.data().qty + newItem.qty });
                }
            }
        }
        await db.collection('purchaseOrders').doc(editingContext.docId).update(data);
    } else {
        if(!customId) customId = 'NH' + String(purchaseOrders.length + 1).padStart(3, '0');
        const newOrder = {
            id: customId, date: date, supplier: supplier, total: totalAmount,
            status: 'Đang chờ', items: currentPurchaseItems, timestamp: Date.now()
        };
        await db.collection('purchaseOrders').add(newOrder);
    }
    
    closeModal('purchase-modal');
}

window.togglePurchaseStatus = async function(docId, currentStatus, orderJsonStr) {
    if(currentStatus === 'Đang chờ') {
        if(confirm('Xác nhận đã nhận hàng? (Hệ thống sẽ tự động cộng số lượng vào Kho và Ghi nhận Công nợ)')) {
            const orderData = JSON.parse(unescape(orderJsonStr));
            await db.collection('purchaseOrders').doc(docId).update({ status: 'Đã nhận hàng' });
            
            orderData.items.forEach(async (orderItem) => {
                let invItem = inventory.find(i => i.code === orderItem.code);
                if(invItem) {
                    await db.collection('inventory').doc(invItem.docId).update({ qty: invItem.qty + orderItem.qty });
                }
            });

            await db.collection('debts').add({
                id: 'CN' + String(debts.length + 1).padStart(3, '0'),
                date: getTodayDate(),
                partner: orderData.supplier,
                type: 'Nợ NCC', amount: orderData.total,
                desc: `Nhập hàng đơn ${orderData.id}`,
                status: 'Chưa thanh toán', timestamp: Date.now()
            });
            alert('Đã nhận hàng và cập nhật hệ thống thành công!');
        }
    }
}


// --- SALES ORDER LOGIC ---
function renderOrders() {
    const tbody = document.getElementById('orders-tbody');
    tbody.innerHTML = '';
    orders.forEach(order => {
        const tr = document.createElement('tr');
        let statusBadge = `<span class="badge ${order.status === 'Hoàn thành' ? 'success' : 'warning'} clickable" onclick="toggleOrderStatus('${order.docId}', '${order.status}')">${order.status}</span>`;
        tr.innerHTML = `
            <td class="font-semibold">${order.id}</td>
            <td>${order.deliveryDate}</td>
            <td>
                <div>${order.customer}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted)">${order.phone || ''}</div>
            </td>
            <td class="text-success font-semibold">${formatCurrency(order.total)}</td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn-icon" style="color:var(--info)" onclick="openEditModal('orders', '${order.docId}')"><i data-lucide="edit-2" style="width:18px"></i></button>
                <button class="btn-icon delete" onclick="deleteItem('orders', '${order.docId}')"><i data-lucide="trash-2" style="width:18px"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

window.toggleOrderStatus = async function(docId, currentStatus) {
    const newStatus = currentStatus === 'Hoàn thành' ? 'Đang xử lý' : 'Hoàn thành';
    await db.collection('orders').doc(docId).update({ status: newStatus });
}

function updateCustomerList() {
    const list = document.getElementById('customer-list');
    if(!list) return;
    let customers = new Set();
    orders.forEach(o => { if(o.customer) customers.add(o.customer); });
    list.innerHTML = '';
    customers.forEach(c => {
        list.innerHTML += `<option value="${c}">`;
    });
}

function updateOrderSelect() {
    const dataList = document.getElementById('inventory-list-instock');
    if(!dataList) return;
    dataList.innerHTML = '';
    inventory.forEach(item => {
        dataList.innerHTML += `<option value="${item.code} - ${item.name || ''}">Tồn kho: ${item.qty} ${item.unit}</option>`;
    });
}

window.fillOrderPrice = function() {
    let inputValue = document.getElementById('ord-product-select').value;
    const priceInput = document.getElementById('ord-item-price');
    if(!inputValue) { priceInput.value = ''; return; }
    
    inputValue = inputValue.split(' - ')[0].trim().toUpperCase();
    const product = inventory.find(i => i.code === inputValue || (i.name && i.name.toUpperCase() === inputValue));
    if(product) priceInput.value = product.outPrice;
}

window.addOrderItem = function() {
    const select = document.getElementById('ord-product-select');
    const priceInput = document.getElementById('ord-item-price');
    const qtyInput = document.getElementById('ord-qty');
    
    let inputValue = select.value.trim();
    if(!inputValue) return alert('Vui lòng chọn hoặc nhập SP');
    
    let searchVal = inputValue.split(' - ')[0].trim().toUpperCase();
    const price = parseInt(priceInput.value) || 0;
    const qty = parseInt(qtyInput.value) || 1;

    let product = inventory.find(i => i.code === searchVal || (i.name && i.name.toUpperCase() === inputValue.toUpperCase()));
    
    if(!product) {
        if(confirm(`"${inputValue}" là sản phẩm mới. Hệ thống sẽ tự tạo mã và thêm vào kho. Bạn có đồng ý không?`)) {
            let codePrefix = inputValue.split(' ').filter(w => w.length > 0).map(w => w.charAt(0).toUpperCase()).join('').substring(0, 4);
            let count = inventory.filter(i => i.code && i.code.startsWith(codePrefix)).length + 1;
            let newCode = codePrefix + String(count).padStart(2, '0');
            
            product = {
                name: inputValue, code: newCode, unit: 'CÁI',
                qty: 0, inPrice: price, outPrice: price,
                supplier: 'Chưa rõ', timestamp: Date.now()
            };
            db.collection('inventory').add(product);
        } else {
            return;
        }
    } else {
        if(qty > product.qty) {
             if(!confirm(`Tồn kho hiện tại (${product.qty}) không đủ. Bạn có muốn bán quá số lượng kho?`)) return;
        }
    }

    const code = product.code;
    const existingItem = currentOrderItems.find(i => i.code === code);
    if(existingItem) {
        existingItem.qty += qty;
        existingItem.price = price; 
    } else {
        currentOrderItems.push({ code: product.code, name: product.name ? `${product.code} - ${product.name}` : `${product.code} - ${product.unit}`, price: price, qty: qty });
    }
    renderOrderItems();
    qtyInput.value = 1; select.value = ""; priceInput.value = "";
}

window.renderOrderItems = function() {
    const list = document.getElementById('ord-items-list');
    list.innerHTML = '';
    let productTotal = 0;
    currentOrderItems.forEach((item, index) => {
        productTotal += item.price * item.qty;
        const li = document.createElement('li');
        li.className = 'order-item';
        li.innerHTML = `
            <div>${item.name} <span class="text-muted">x${item.qty} (${formatCurrency(item.price)})</span></div>
            <div>${formatCurrency(item.price * item.qty)} <i data-lucide="trash-2" style="cursor:pointer; color:var(--danger); width:16px; margin-left:10px" onclick="removeOrderItem(${index})"></i></div>
        `;
        list.appendChild(li);
    });
    lucide.createIcons();
    const shippingCost = parseInt(document.getElementById('ord-shipping').value) || 0;
    document.getElementById('ord-total-amount').textContent = formatCurrency(productTotal + shippingCost);
}

window.removeOrderItem = function(index) {
    currentOrderItems.splice(index, 1);
    renderOrderItems();
}

window.handleOrderSubmit = async function(e) {
    e.preventDefault();
    if(currentOrderItems.length === 0) return alert('Vui lòng thêm ít nhất 1 sản phẩm');

    let customId = document.getElementById('ord-id').value;
    const customer = document.getElementById('ord-customer').value;
    const phone = document.getElementById('ord-phone').value;
    const address = document.getElementById('ord-address').value;
    const deliveryDate = document.getElementById('ord-date').value;
    const shipping = parseInt(document.getElementById('ord-shipping').value) || 0;
    const isDebt = document.getElementById('ord-debt-check').checked;
    
    const productTotal = currentOrderItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalAmount = productTotal + shipping;
    const status = isDebt ? 'Chưa thanh toán' : 'Hoàn thành';
    
    if(editingContext.docId) {
        const oldOrder = editingContext.oldData;
        const data = {
            deliveryDate, customer, phone, address, shipping, total: totalAmount, status, items: currentOrderItems
        };
        if(customId) data.id = customId;

        // Auto-diff inventory logic
        const oldItems = oldOrder.items || [];
        // Revert old items
        for(let oldItem of oldItems) {
            let invItem = inventory.find(i => i.code === oldItem.code);
            if(invItem) await db.collection('inventory').doc(invItem.docId).update({ qty: invItem.qty + oldItem.qty });
        }
        // Apply new items
        for(let newItem of currentOrderItems) {
            let invDoc = await db.collection('inventory').where('code', '==', newItem.code).get();
            if(!invDoc.empty) {
                let idoc = invDoc.docs[0];
                await db.collection('inventory').doc(idoc.id).update({ qty: idoc.data().qty - newItem.qty });
            }
        }
        
        await db.collection('orders').doc(editingContext.docId).update(data);
    } else {
        if(!customId) customId = 'DH' + String(orders.length + 1).padStart(3, '0');
        const newOrder = {
            id: customId, date: getTodayDate(), deliveryDate, customer, phone, address, shipping,
            total: totalAmount, status, items: currentOrderItems, timestamp: Date.now()
        };
        
        currentOrderItems.forEach(async (orderItem) => {
            let invItem = inventory.find(i => i.code === orderItem.code);
            if(invItem) {
                await db.collection('inventory').doc(invItem.docId).update({ qty: invItem.qty - orderItem.qty });
            }
        });

        await db.collection('orders').add(newOrder);
        
        if(isDebt) {
            await db.collection('debts').add({
                id: 'CN' + String(debts.length + 1).padStart(3, '0'),
                date: getTodayDate(), partner: customer, type: 'Khách nợ', amount: totalAmount,
                desc: `Đơn hàng ${customId}`, status: 'Chưa thanh toán', timestamp: Date.now()
            });
        }
    }
    
    closeModal('order-modal');
    
    // Check low stock
    const lowStockAlerts = inventory.filter(i => (i.qty - currentOrderItems.filter(ci=>ci.code===i.code).reduce((s,c)=>s+c.qty,0)) <= 3);
    if(lowStockAlerts.length > 0) alert('Thao tác thành công!\n⚠️ Lưu ý: Một số mặt hàng sắp hết kho!');
}


// --- MODAL UTILS ---
window.openModal = function(id) {
    document.getElementById(id).classList.add('active');
}
window.closeModal = function(id) {
    document.getElementById(id).classList.remove('active');
    resetFormUI(id);
}

document.querySelectorAll('.modal-overlay').forEach(modal => {
    // modal.addEventListener('click', (e) => {
    //     if(e.target === modal) {
    //         modal.classList.remove('active');
    //         resetFormUI(modal.id);
    //     }
    // });
});
