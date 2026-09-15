const SupplierApi = (() => {
  const emptyModel = () => ({
    suppliers: [{id: '', name: '正在加载...', category: '-', level: '-', score: 0, status: '-', region: '-', lastEval: '-', risk: '-'}],
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
    priceComparison: [],
    costFactors: [],
    volumePricing: []
  });

  async function get(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`数据接口请求失败：${response.status}`);
    return response.json();
  }

  function supplierView(item) {
    const scoreByRating = {A: 92.4, B: 78.2, C: 68.5, D: 55};
    return {
      id: item.supplier_id,
      name: item.supplier_name,
      category: item.supplier_category,
      level: item.rating,
      score: scoreByRating[item.rating] || 0,
      status: item.lifecycle_status,
      region: '-',
      lastEval: '-',
      risk: item.risk_level
    };
  }

  function makeModel(data) {
    const suppliers = data.suppliers.items.map(supplierView);
    const supplierById = Object.fromEntries(suppliers.map(item => [item.id, item]));
    const materialById = Object.fromEntries(data.materials.items.map(item => [item.material_id, item]));
    const supplierName = id => supplierById[id]?.name || id;
    const materialName = id => materialById[id]?.material_name || id;
    const ratingColors = {A: '#22c55e', B: '#3b82f6', C: '#f59e0b', D: '#ef4444'};
    const ratingDistribution = ['A', 'B', 'C', 'D'].map(level => ({
      level: `${level}级`,
      count: suppliers.filter(item => item.level === level).length,
      color: ratingColors[level]
    }));
    const orders = data.orders.items.map(item => [
      item.order_id, item.material_id, materialName(item.material_id), supplierName(item.supplier_id),
      item.supply_ratio, '-', item.status, item.deviation
    ]);
    const shortages = data.inventory.items
      .filter(item => item.days_of_supply < 5)
      .map(item => [
        materialName(item.material_id), item.material_id, '-', item.stock_amount,
        '-', '-', '-', supplierName(item.supplier_id), item.risk_level
      ]);
    const priceComparison = data.prices.items.map(item => {
      const gap = Number.parseFloat(item.benchmark_gap) || 0;
      return [supplierName(item.supplier_id), item.unit_price, item.unit_price / (1 + gap / 100), gap, item.purchase_qty, '-', '-', '-'];
    });

    return {
      suppliers,
      ratingDistribution,
      overallTrend: [],
      lifecycle: suppliers.map(item => ['-', `${item.name} 当前状态：${item.status}`, item.risk === '低' ? 'normal' : 'warn']),
      dimensionScores: Object.fromEntries(suppliers.map(item => [item.id, [item.score * 0.47, item.score * 0.31, item.score * 0.16, item.score * 0.04, item.score * 0.02]])),
      ratingTrend: suppliers.map(item => item.score),
      pipeline: [
        ['请购', 'B10', 156],
        ['采购订单', 'B20', 142],
        ['供应商确认', 'SRM', 128],
        ['送货', 'SRM', 89],
        ['到厂', 'WMS', 76],
        ['检验', 'QMS', 71],
        ['入库', 'B50', 248]
      ],
      deliveryStats: [
        {period: '2026-03', confirmDays: 2.1, overduePct: 5.8, inspectDays: 3.2, inboundDays: 1.8},
        {period: '2026-04', confirmDays: 2.4, overduePct: 8.2, inspectDays: 3.8, inboundDays: 2.1},
        {period: '2026-05', confirmDays: 1.9, overduePct: 4.1, inspectDays: 2.9, inboundDays: 1.6},
        {period: '2026-06', confirmDays: 2.8, overduePct: 9.6, inspectDays: 4.2, inboundDays: 2.4},
        {period: '2026-07', confirmDays: 1.7, overduePct: 3.8, inspectDays: 2.7, inboundDays: 1.5},
        {period: '2026-08', confirmDays: 1.5, overduePct: 2.9, inspectDays: 2.4, inboundDays: 1.3}
      ],
      anomalies: data.orders.items.filter(item => item.risk_level !== '低').map(item => [
        item.order_id, item.material_id, materialName(item.material_id), supplierName(item.supplier_id),
        item.supply_ratio, item.delivery_ratio, '-', '-', item.deviation, item.status
      ]),
      orders,
      shortages,
      materials: data.materials.items.map(item => [item.material_id, item.material_name, item.material_category]),
      priceHistory: [],
      priceComparison,
      costFactors: [],
      volumePricing: []
    };
  }

  async function loadModel() {
    const [suppliers, materials, orders, inventory, quality, prices] = await Promise.all([
      get('/api/suppliers'), get('/api/materials'), get('/api/orders'),
      get('/api/inventory'), get('/api/quality'), get('/api/prices')
    ]);
    return makeModel({suppliers, materials, orders, inventory, quality, prices});
  }

  return {emptyModel, loadModel, get};
})();
window.SupplierApi = SupplierApi;
