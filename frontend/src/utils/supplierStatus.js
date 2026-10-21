const supplierStatusLabels = {
  合格: '合格供应商',
  淘汰: '淘汰供应商',
  陌生: '陌生供应商',
  黑名单: '黑名单供应商'
};

export function supplierStatusLabel(status) {
  return supplierStatusLabels[status] || status;
}
