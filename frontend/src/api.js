const SupplierApi = (() => {
  const emptyModel = () => ({
    suppliers: [{id: '', name: '正在加载...', category: '-', level: '-', score: 0, status: '-', region: '-', lastEval: '-', risk: '-'}],
    profileOverview: {supplier_count: 0, active_supplier_count: 0, risk_supplier_count: 0, average_score: 0, on_time_delivery_rate: null, quality_pass_rate: null, province_distribution: [], rating_distribution: [], lifecycle_distribution: [], overall_trend: []},
    ratingSummary: {total: 0, counts: {A: 0, B: 0, C: 0, D: 0}, averageScore: 0},
    deliverySummary: {totalOrders: 0, inTransitCount: 0, exceptionCount: 0, overdueCount: 0, onTimeRate: null, averageReceiptDays: 0, shortageCount: 0, highRiskShortageCount: 0, statusCounts: {}},
    priceSummaries: {},
    ratingDistribution: [],
    overallTrend: [],
    lifecycle: [],
    dimensionScores: {},
    ratingTrend: [],
    pipeline: [],
    deliveryStats: [],
    anomalies: [],
    orders: [],
    shortages: [],
    materials: [],
    priceHistory: [],
    purchaseHistory: [],
    priceComparison: [],
    costFactors: [],
    volumePricing: []
    ,deliveryFlow: {requisitions: [], confirmations: [], deliveryNotes: [], receipts: [], warehouseEntries: [], agreements: [], rawOrders: [], quality: [], inventory: []}
  });

  async function get(path) {
    const response = await fetch(path);
    if (!response.ok) {
      const error = new Error(`数据接口请求失败：${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  function listSuppliers(name = '') {
    const query = name ? `?name=${encodeURIComponent(name)}` : '';
    return get(`/api/suppliers${query}`);
  }

  function getSupplierByName(name) {
    return get(`/api/suppliers/by-name?name=${encodeURIComponent(name)}`);
  }

  function getSupplierById(supplierId) {
    return get(`/api/suppliers/${encodeURIComponent(supplierId)}`);
  }

  function getSupplierProfile(supplierId) {
    return get(`/api/suppliers/${encodeURIComponent(supplierId)}/profile`);
  }

  function getProfileOverview(filters = {}) {
    const query = new URLSearchParams();
    if (filters.status && filters.status !== '全部') query.set('status', filters.status);
    if (filters.rating && filters.rating !== '全部') query.set('rating', filters.rating);
    return get(`/api/profile/overview${query.size ? `?${query}` : ''}`);
  }

  function getExpectedOrders(supplierId, startDate, endDate) {
    const query = new URLSearchParams();
    if (startDate) query.set('start_date', startDate);
    if (endDate) query.set('end_date', endDate);
    return get(`/api/suppliers/${encodeURIComponent(supplierId)}/expected-orders?${query}`);
  }

  function supplierView(item) {
    const events = item.lifecycle_events || [];
    return {
      id: item.supplier_id,
      name: item.supplier_name,
      category: item.supplier_category,
      level: item.rating,
      score: item.evaluation_score ?? null,
      status: item.lifecycle_status,
      region: item.province || '未填写',
      lastEval: events.length ? events[events.length - 1].date : '-',
      risk: item.risk_level,
      ratingDimensions: item.rating_dimensions || []
    };
  }

  async function searchSuppliers(query, mode) {
    if (!query.trim()) {
      const result = await listSuppliers();
      return result.items.map(supplierView);
    }
    if (mode === 'id') {
      try {
        const detail = await getSupplierById(query.trim().toUpperCase());
        return [supplierView(detail.supplier)];
      } catch (error) {
        if (error.status === 404) return [];
        throw error;
      }
    }
    const result = await listSuppliers(query.trim());
    return result.items.map(supplierView);
  }

  function makeModel(data) {
    const suppliers = data.suppliers.items.map(supplierView);
    const supplierById = Object.fromEntries(suppliers.map(item => [item.id, item]));
    const materialById = Object.fromEntries(data.materials.items.map(item => [item.material_id, item]));
    const supplierName = id => supplierById[id]?.name || id;
    const materialName = id => materialById[id]?.material_name || id;
    const ratingColors = {A: '#22c55e', B: '#3b82f6', C: '#f59e0b', D: '#ef4444'};
    const ratingLevels = [...new Set(['A', 'B', 'C', 'D', ...suppliers.map(item => item.level || '未评级')])];
    const ratingDistribution = ratingLevels.map(level => ({
      level: level === '未评级' ? level : `${level}级`,
      count: suppliers.filter(item => (item.level || '未评级') === level).length,
      color: ratingColors[level] || '#64748b'
    }));
    const orders = data.orders.items.map(item => [
      item.order_id, item.material_id, materialName(item.material_id), supplierName(item.supplier_id),
      item.supply_ratio, item.expected_delivery_date || '-', item.status, item.deviation, item.delivery_ratio
    ]);
    const ordersByMaterial = Object.groupBy
      ? Object.groupBy(data.orders.items, item => item.material_id)
      : data.orders.items.reduce((groups, item) => ((groups[item.material_id] ||= []).push(item), groups), {});
    const shortages = data.inventory.items
      .filter(item => item.days_of_supply < 5)
      .map(item => {
        const materialOrders = ordersByMaterial[item.material_id] || [];
        const supplierOrders = materialOrders.filter(order => order.supplier_id === item.supplier_id);
        const transitOrders = supplierOrders.filter(order => order.status !== '已完成');
        return [
          materialName(item.material_id), item.material_id, transitOrders.length, item.stock_amount,
          item.days_of_supply, item.risk_basis, transitOrders.map(order => order.expected_delivery_date).filter(Boolean).sort()[0] || '-',
          supplierName(item.supplier_id), item.risk_level
        ];
      });
    const priceRecords = data.prices.items.map(item => {
      const gap = Number.parseFloat(item.benchmark_gap) || 0;
      const benchmarkPrice = item.unit_price / (1 + gap / 100);
      return {
        ...item,
        supplier_name: supplierName(item.supplier_id),
        material_name: materialName(item.material_id),
        benchmark_price: benchmarkPrice,
        gap,
        impact_amount: (item.unit_price - benchmarkPrice) * item.purchase_qty
      };
    });
    const purchaseHistory = (data.purchaseHistory?.items || []).map(item => ({
      ...item,
      supplier_name: supplierName(item.supplier_id),
      material_name: materialName(item.material_id),
      specification: item.specification || materialById[item.material_id]?.specification || '-'
    }));
    const priceSummaryByMaterial = priceRecords.reduce((groups, item) => {
      (groups[item.material_id] ||= []).push(item);
      return groups;
    }, {});
    const priceSummaries = Object.fromEntries(Object.entries(priceSummaryByMaterial).map(([materialId, rows]) => {
      const sorted = rows.slice().sort((a, b) => a.record_date.localeCompare(b.record_date));
      const totalQty = rows.reduce((sum, item) => sum + item.purchase_qty, 0);
      return [materialId, {
        latest: sorted[sorted.length - 1],
        minimum: Math.min(...rows.map(item => item.unit_price)),
        maximum: Math.max(...rows.map(item => item.unit_price)),
        weightedAverage: totalQty ? rows.reduce((sum, item) => sum + item.unit_price * item.purchase_qty, 0) / totalQty : 0,
        records: sorted
      }];
    }));
    const statusNames = [...new Set(['已完成', '部分交付', '逾期未完', '待确认', ...data.orders.items.map(item => item.status)])];
    const statusCounts = Object.fromEntries(statusNames.map(status => [status, data.orders.items.filter(item => item.status === status).length]));
    const receivedOrders = data.orders.items.filter(item => item.actual_delivery_date);
    const onTimeOrders = receivedOrders.filter(item => item.actual_delivery_date <= item.expected_delivery_date);
    const receiptCycles = receivedOrders.map(item => item.receipt_cycle_days).filter(Number.isFinite);
    const ratingCounts = Object.fromEntries(ratingLevels.map(level => [level, suppliers.filter(item => (item.level || '未评级') === level).length]));
    const average = values => { const numbers=values.filter(Number.isFinite); return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : 0; };
    const byPeriod = new Map();
    const periodStats = period => {
      if (!byPeriod.has(period)) byPeriod.set(period, {confirm: [], overdue: [], inspection: [], inbound: []});
      return byPeriod.get(period);
    };
    for (const item of data.orders.items) {
      const period = item.expected_delivery_date?.slice(0, 7);
      if (!period) continue;
      const values = periodStats(period);
      if (Number.isFinite(item.confirmation_days)) values.confirm.push(item.confirmation_days);
      values.overdue.push(item.status === '逾期未完' ? 1 : 0);
      if (Number.isFinite(item.receipt_cycle_days)) values.inbound.push(item.receipt_cycle_days);
    }
    for (const item of data.quality.items) {
      const period = item.inspection_date?.slice(0, 7);
      if (period && Number.isFinite(item.inspection_cycle_days)) periodStats(period).inspection.push(item.inspection_cycle_days);
    }
    const deliveryStats = [...byPeriod.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([period, values]) => ({
      period,
      confirmDays: average(values.confirm),
      overduePct: average(values.overdue) * 100,
      inspectDays: average(values.inspection),
      inboundDays: average(values.inbound)
    }));
    const priceComparison = priceRecords.map(item => [
      item.supplier_name, item.material_name, item.unit_price, item.benchmark_price, item.gap,
      item.purchase_qty, item.quality_rate, item.time_compliance
    ]);

    const profileOverview = data.profileOverview || {
      supplier_count: suppliers.length,
      active_supplier_count: suppliers.filter(item => item.status === '在供').length,
      risk_supplier_count: suppliers.filter(item => ['高', '中'].includes(item.risk)).length,
      average_score: average(suppliers.map(item => item.score)),
      on_time_delivery_rate: receivedOrders.length ? onTimeOrders.length / receivedOrders.length * 100 : null,
      quality_pass_rate: null,
      province_distribution: Object.entries(suppliers.reduce((groups, item) => { groups[item.region] = (groups[item.region] || 0) + 1; return groups; }, {})).map(([name, count]) => ({name, count})),
      rating_distribution: ratingLevels.map(name => ({name, count: suppliers.filter(item => (item.level || '未评级') === name).length})),
      overall_trend: []
    };
    return {
      suppliers,
      ratingDistribution,
      ratingSummary: {
        total: suppliers.length,
        counts: ratingCounts,
        averageScore: average(suppliers.map(item => item.score))
      },
      deliverySummary: {
        totalOrders: data.orders.items.length,
        inTransitCount: data.orders.items.filter(item => item.status !== '已完成').length,
        exceptionCount: data.orders.items.filter(item => item.risk_level !== '低').length,
        overdueCount: data.orders.items.filter(item => item.status === '逾期未完').length,
        onTimeRate: receivedOrders.length ? onTimeOrders.length / receivedOrders.length * 100 : null,
        averageReceiptDays: average(receiptCycles),
        shortageCount: data.inventory.items.filter(item => item.days_of_supply < 5).length,
        highRiskShortageCount: data.inventory.items.filter(item => item.days_of_supply < 5 && item.risk_level === '高').length,
        statusCounts
      },
      priceSummaries,
      profileOverview,
      overallTrend: (profileOverview.overall_trend || []).map(item => ({month: item.month, onTime: Number(item.onTime) || 0, quality: Number(item.quality) || 0})),
      lifecycle: suppliers.flatMap(item => (data.suppliers.items.find(raw => raw.supplier_id === item.id)?.lifecycle_events || []).map(event => [event.date, `${item.name}：${event.event}`, event.status])),
      dimensionScores: Object.fromEntries(suppliers.map(item => [item.id, item.ratingDimensions])),
      ratingTrend: [],
      pipeline: statusNames.map(status => [status, '订单', statusCounts[status]]),
      deliveryStats,
      anomalies: data.orders.items.filter(item => item.risk_level !== '低').map(item => [
        item.order_id, item.material_id, materialName(item.material_id), supplierName(item.supplier_id),
        item.supply_ratio, item.delivery_ratio, item.expected_delivery_date || '-', item.actual_delivery_date || '-', item.deviation, item.status
      ]),
      orders,
      shortages,
      materials: data.materials.items.map(item => [item.material_id, item.material_name, item.material_category]),
      priceHistory: priceRecords,
      purchaseHistory,
      priceComparison,
      costFactors: priceRecords.map(item => [
        `${item.supplier_name} · ${item.material_name}`,
        item.benchmark_price,
        item.unit_price - item.benchmark_price,
        `${item.gap.toFixed(1)}%`,
        `按 ${item.purchase_qty.toLocaleString()} 件估算，价差金额 ¥${item.impact_amount.toFixed(2)}`
      ]),
      volumePricing: []
      ,deliveryFlow: {
        requisitions: data.requisitions.items,
        confirmations: data.confirmations.items,
        deliveryNotes: data.deliveryNotes.items,
        receipts: data.receipts.items,
        warehouseEntries: data.warehouseEntries.items,
        agreements: data.agreements.items,
        rawOrders: data.orders.items,
        quality: data.quality.items,
        inventory: data.inventory.items
      }
    };
  }

  async function loadModel() {
    const [suppliers, materials, orders, inventory, quality, prices, profileOverview, requisitions, confirmations, deliveryNotes, receipts, warehouseEntries, agreements, purchaseHistory] = await Promise.all([
      listSuppliers(), get('/api/materials'), get('/api/orders'),
      get('/api/inventory'), get('/api/quality'), get('/api/prices'), getProfileOverview(),
      get('/api/purchase-requisitions'), get('/api/order-confirmations'), get('/api/delivery-notes'),
      get('/api/receipts'), get('/api/warehouse-entries'), get('/api/supply-agreements'), get('/api/purchase-history')
    ]);
    return makeModel({suppliers, materials, orders, inventory, quality, prices, profileOverview, requisitions, confirmations, deliveryNotes, receipts, warehouseEntries, agreements, purchaseHistory});
  }

  return {emptyModel, loadModel, get, listSuppliers, getSupplierByName, getSupplierById, getSupplierProfile, getProfileOverview, getExpectedOrders, searchSuppliers, supplierView};
})();
export default SupplierApi;
