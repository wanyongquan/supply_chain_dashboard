const { createApp, ref, computed, onMounted, nextTick, watch } = Vue;
const D = ref(window.SupplierApi.emptyModel());

const NAV = [
  {id:'profile',label:'供应商画像',sub:'全生命周期·风险预警',icon:'◉'},
  {id:'rating',label:'供应商评级',sub:'综合评级·模型管理',icon:'☆'},
  {id:'delivery',label:'采购交付',sub:'全链路跟踪·异常监控',icon:'⇄'},
  {id:'price',label:'比价分析',sub:'历史价格·成本因素',icon:'▥'}
];

let supplierMapChart;
let supplierMapGeoLoaded = false;
window.renderSupplierMap = async (mapData = {}) => {
  const el = document.getElementById('supplier-map-chart');
  if (!el || !window.echarts) return;
  if (!supplierMapGeoLoaded) {
    try {
      const response = await fetch('https://geojson.cn/api/china/china.json');
      const geoJson = await response.json();
      echarts.registerMap('china', geoJson);
      supplierMapGeoLoaded = true;
    } catch (error) {
      el.innerHTML = '<div class="map-loading">地图边界数据加载失败，请检查网络连接</div>';
      return;
    }
  }
  // 页面切换时 Vue 会重建容器，旧实例不能继续绑定旧 DOM。
  if (supplierMapChart && supplierMapChart.getDom() !== el) {
    supplierMapChart.dispose();
    supplierMapChart = null;
  }
  supplierMapChart ||= echarts.init(el);
  const values = mapData;
  const provinceName = name => ['北京','天津','上海','重庆'].includes(name) ? `${name}市` : name === '内蒙古' ? '内蒙古自治区' : name === '广西' ? '广西壮族自治区' : name === '宁夏' ? '宁夏回族自治区' : name === '新疆' ? '新疆维吾尔自治区' : name === '西藏' ? '西藏自治区' : name === '香港' ? '香港特别行政区' : name === '澳门' ? '澳门特别行政区' : `${name}省`;
  // 不同 GeoJSON 数据源可能使用“广东”或“广东省”等名称，双写别名确保区域能匹配上。
  const data = Object.entries(values).flatMap(([name, value]) => [{name, value}, {name: provinceName(name), value}]);
  supplierMapChart.setOption({
    tooltip: {trigger: 'item', formatter: p => `${p.name}<br/>供应商数量：${Number.isFinite(Number(p.value)) ? Number(p.value) : 0} 家`},
    visualMap: {min: 0, max: Math.max(20, ...data.map(x => x.value)), left: 12, bottom: 12, text: ['多', '少'], calculable: false, textStyle: {color: '#94a3b8', fontSize: 10}, inRange: {color: ['#102a43', '#1d4ed8', '#06b6d4']}},
    series: [{type: 'map', map: 'china', roam: false, layoutCenter: ['50%', '48%'], layoutSize: '108%', label: {show: true, color: '#b7c9e2', fontSize: 9}, itemStyle: {areaColor: '#12233d', borderColor: '#3b82f680', borderWidth: 1}, emphasis: {label: {color: '#fff'}, itemStyle: {areaColor: '#22d3ee'}}, data}]
  });
  window.addEventListener('resize', () => supplierMapChart?.resize(), {once: true});
};

createApp({
  setup(){
    const active=ref('profile'), profileSub=ref('overview'), role=ref('公司管理层'), alertOpen=ref(true);
    const apiError=ref('');
    const supplierId=ref('S001'), detailTab=ref(0), priceTab=ref(0), deliveryTab=ref(0), searchMode=ref('name'), search=ref(''), ratingSearch=ref(''), selectedMaterial=ref(0);
    const supplierSearchResults=ref([]), selectedSupplierDetail=ref(null), selectedSupplierProfile=ref(null);
    const profileYear=ref('2026'), profileStatus=ref('全部'), profileLevel=ref('全部');
    const compareIds=ref(['S001','S002']);
    const current=computed(()=>NAV.find(n=>n.id===active.value));
    const profileOverview=computed(()=>D.value.profileOverview);
    const supplier=computed(()=>selectedSupplierDetail.value||D.value.suppliers.find(s=>s.id===supplierId.value)||D.value.suppliers[0]);
    const supplierList=computed(()=>supplierSearchResults.value);
    const riskAlerts=computed(()=>[
      ...D.value.suppliers.filter(item=>item.risk==='高').map(item=>`${item.name}：${item.risk}风险，${item.status}`),
      ...D.value.anomalies.map(item=>`${item[0]} ${item[3]}：交付比例 ${item[5]}，${item[9]}`),
      ...D.value.shortages.filter(item=>item[8]==='高').map(item=>`${item[7]}：${item[0]}供货天数 ${item[4]} 天，库存预警`)
    ]);
    const provinceOverview=computed(()=>Object.fromEntries((profileOverview.value?.province_distribution||[]).map(item=>[item.name,Number(item.count)||0])));
    const overviewRatingDistribution=computed(()=> (profileOverview.value?.rating_distribution||[]).map(item=>({level:item.name==='未评级'?item.name:`${item.name}级`,count:Number(item.count)||0,color:({A:'#22c55e',B:'#3b82f6',C:'#f59e0b',D:'#ef4444'})[item.name]||'#64748b'})));
    const ratingDonutStyle=computed(()=>{
      const total=overviewRatingDistribution.value.reduce((sum,item)=>sum+item.count,0);
      const colors=overviewRatingDistribution.value.map(item=>item.color);
      let offset=0;
      const stops=overviewRatingDistribution.value.map((item,index)=>{
        const start=total?offset/total*100:0;
        offset+=item.count;
        const end=total?offset/total*100:0;
        return `${colors[index]} ${start}% ${end}%`;
      });
      return {'--donut-gradient':total?`conic-gradient(${stops.join(',')})`:'conic-gradient(#64748b 0 100%)'};
    });
    const fullRatingDonutStyle=computed(()=>{
      const counts=D.value.ratingDistribution.map(item=>({...item,count:Number(item.count)}));
      const total=counts.reduce((sum,item)=>sum+item.count,0);
      let offset=0;
      const stops=counts.map(item=>{
        const start=total?offset/total*100:0;
        offset+=item.count;
        return `${item.color} ${start}% ${total?offset/total*100:0}%`;
      });
      return {'--donut-gradient':total?`conic-gradient(${stops.join(',')})`:'conic-gradient(#64748b 0 100%)'};
    });
    const overviewSuppliers=computed(()=>profileOverview.value.suppliers||[]);
    const ratingList=computed(()=>D.value.suppliers.filter(s=>!ratingSearch.value||`${s.name}${s.id}`.includes(ratingSearch.value)).sort((a,b)=>b.score-a.score));
    const dims=computed(()=>{const v=D.value.dimensionScores[supplierId.value]||[];return [['质量',v[0]??0,45],['交付',v[1]??0,30],['技术',v[2]??0,16],['成本',v[3]??0,7],['廉洁合作',v[4]??0,2]]});
    const selectedPriceSummary=computed(()=>{
      const material=D.value.materials[selectedMaterial.value];
      return material?D.value.priceSummaries[material[0]]:null;
    });
    const selectedPriceComparison=computed(()=>selectedPriceSummary.value?.records.map(item=>[
      item.supplier_name,item.material_name,item.unit_price,item.benchmark_price,item.gap,
      item.purchase_qty,item.quality_rate,item.time_compliance
    ])||[]);
    const selectedCostFactors=computed(()=>selectedPriceSummary.value?.records.map(item=>{
      const priceGap=item.unit_price-item.benchmark_price;
      const impact=priceGap*item.purchase_qty;
      return [
        `${item.supplier_name} · ${item.material_name}`,
        item.benchmark_price,
        priceGap,
        `${item.gap.toFixed(1)}%`,
        `采购数量 ${item.purchase_qty.toLocaleString()}，估算价差 ¥${impact.toFixed(2)}`
      ];
    })||[]);
    const loadSupplierProfile=async id=>{
      selectedSupplierDetail.value=null;selectedSupplierProfile.value=null;
      try {
        const profile=await window.SupplierApi.getSupplierProfile(id);
        if(id!==supplierId.value)return;
        selectedSupplierProfile.value=profile;
        selectedSupplierDetail.value=window.SupplierApi.supplierView(profile.supplier);
      } catch (error) { apiError.value=error.message; }
    };
    const selectSupplier=id=>{supplierId.value=id;detailTab.value=0};
    watch(supplierId,id=>{
      if(D.value.suppliers.length>0 && D.value.suppliers[0].id)loadSupplierProfile(id);
    });
    let supplierSearchRequest=0;
    watch([search,searchMode],async()=>{
      const request=++supplierSearchRequest;
      try {
        const results=await window.SupplierApi.searchSuppliers(search.value,searchMode.value);
        if(request===supplierSearchRequest)supplierSearchResults.value=results;
      } catch (error) { apiError.value=error.message; }
    });
    let profileOverviewRequest=0;
    watch([profileStatus,profileLevel],async()=>{
      const request=++profileOverviewRequest;
      try {
        const result=await window.SupplierApi.getProfileOverview({status:profileStatus.value,rating:profileLevel.value});
        if(request===profileOverviewRequest)D.value.profileOverview=result;
      } catch (error) { apiError.value=error.message; }
    });
    const toggleCompare=id=>{const a=compareIds.value;a.includes(id)?compareIds.value=a.filter(x=>x!==id):a.length<4&&a.push(id)};
    onMounted(async()=>{
      try {
        D.value=await window.SupplierApi.loadModel();
        supplierSearchResults.value=D.value.suppliers;
        await loadSupplierProfile(supplierId.value);
      }
      catch (error) { apiError.value=error.message; }
    });
    watch([active, profileSub, provinceOverview], async()=>{
      if(active.value==='profile' && profileSub.value==='overview'){
        await nextTick();
        window.renderSupplierMap?.(provinceOverview.value);
      }
    }, {deep:true});
    return {D,NAV,active,profileSub,role,alertOpen,apiError,supplierId,detailTab,priceTab,deliveryTab,searchMode,search,ratingSearch,selectedMaterial,compareIds,profileYear,profileStatus,profileLevel,profileOverview,overviewRatingDistribution,ratingDonutStyle,fullRatingDonutStyle,selectedSupplierProfile,selectedPriceSummary,selectedPriceComparison,selectedCostFactors,riskAlerts,current,supplier,supplierList,overviewSuppliers,ratingList,dims,provinceOverview,selectSupplier,toggleCompare};
  },
  template:`
  <div class="figma-app">
    <div v-if="apiError" class="figma-alert"><b>数据接口异常</b><span>{{apiError}}</span></div>
    <header class="figma-top">
      <div class="figma-brand"><span>◈</span><div><b>供应链数据中台</b><small>Supplier Intelligence Platform</small></div></div>
      <div class="top-actions"><small>数据源：Demo 原始记录</small><button class="alert-pill" @click="alertOpen=!alertOpen">⚠ {{riskAlerts.length}} 条预警</button><select v-model="role"><option>公司管理层</option><option>中层管理层</option></select><i>采</i></div>
    </header>
    <div v-if="alertOpen" class="figma-alert"><b>风险预警</b><span v-for="alert in riskAlerts"><i></i>{{alert}}</span><span v-if="!riskAlerts.length">当前没有符合预警条件的数据</span><button @click="alertOpen=false">×</button></div>
    <div :class="['viewbar',role==='公司管理层'?'blue':'purple']"><b>当前视角：{{role}}</b><span>— {{role==='公司管理层'?'优先展示公司层面整体统计与分析':'优先关注日常操作明细与查询功能'}}</span></div>
    <div class="app-workspace">
      <aside class="figma-sidebar"><div class="side-caption">供应链主题看板</div><button v-for="n in NAV" :class="{active:active===n.id}" @click="active=n.id"><i>{{n.icon}}</i><span><b>{{n.label}}</b><small>{{n.sub}}</small></span></button><div class="side-status"><b>数据源状态</b><span><i></i>Demo JSON 已加载</span><small>统计由原始记录生成</small></div></aside>
      <main class="figma-main"><div class="page-heading"><div><h1>{{current.label}}</h1><p>{{current.sub}}</p></div></div>

        <section v-if="active==='profile'" class="page-stack">
          <div v-if="active==='profile'" class="profile-subnav"><button v-for="x in [{id:'overview',label:'主页概览'},{id:'basic',label:'基础信息'},{id:'capacity',label:'供应能力'},{id:'delivery',label:'履约分析'},{id:'credit',label:'信用风险'},{id:'quality',label:'质量管理'}]" :class="{active:profileSub===x.id}" @click="profileSub=x.id">{{x.label}}</button></div>
          <template v-if="active==='profile' && profileSub==='overview'">
          <Divider label="整体供应商统计概览" :hot="role==='公司管理层'" :role="role"/>
          <div class="query-panel compact"><label>状态<select v-model="profileStatus"><option value="全部">全部</option><option v-for="item in profileOverview.lifecycle_distribution" :value="item.name">{{item.name}}</option></select></label><label>供应商等级<select v-model="profileLevel"><option value="全部">全部</option><option v-for="item in profileOverview.rating_distribution" :value="item.name">{{item.name==='未评级'?'未评级':item.name+'级'}}</option></select></label><button @click="profileStatus='全部';profileLevel='全部'">重置</button></div>
          <div class="stat-grid six"><Stat label="供应商总数" :value="profileOverview.supplier_count+'家'"/><Stat label="在供供应商" :value="profileOverview.active_supplier_count+'家'" tone="green"/><Stat label="中高风险供应商" :value="profileOverview.risk_supplier_count+'家'" tone="amber"/><Stat label="平均评级得分" :value="profileOverview.average_score+'分'"/><Stat label="准时交付率" :value="profileOverview.on_time_delivery_rate===null?'暂无':profileOverview.on_time_delivery_rate+'%'" tone="green"/><Stat label="批次质量合格率" :value="profileOverview.quality_pass_rate===null?'暂无':profileOverview.quality_pass_rate+'%'" tone="green"/></div>
          <div class="grid map-layout"><Card title="供应商省份分布"><div id="supplier-map-chart" class="supplier-map-chart"></div></Card><DataBox title="省份供应商数量排行" :headers="['省份','供应商数量']" :rows="Object.entries(provinceOverview).sort((a,b)=>b[1]-a[1]).map(x=>[x[0],x[1]+'家'])"/></div>
          </template>
          <template v-else-if="active==='profile' && profileSub==='basic'">
          <Divider label="供应商查询与单体画像" :hot="role==='中层管理层'" :role="role"/>
          <div class="supplier-layout"><aside class="supplier-list"><div class="search-mode"><button :class="{active:searchMode==='name'}" @click="searchMode='name'">按名称</button><button :class="{active:searchMode==='id'}" @click="searchMode='id'">按编号</button></div><input v-model="search" :placeholder="searchMode==='name'?'输入名称关键词...':'如 S001'"><div class="supplier-scroll"><button v-for="s in supplierList" :class="{active:supplierId===s.id}" @click="selectSupplier(s.id)"><div><small>{{s.id}}</small><Badge :text="s.level+'级'" :tone="s.level"/></div><b>{{s.name}}</b><div><small>{{s.category}}</small><Badge :text="s.status" :tone="s.status"/></div></button></div></aside>
            <div class="supplier-detail"><div class="supplier-head"><div><h2>{{supplier.name}} <Badge :text="supplier.level+'级'" :tone="supplier.level"/> <Badge :text="supplier.status" :tone="supplier.status"/></h2><p>{{supplier.id}} · {{supplier.category}} · {{supplier.region}} · 最近评审 {{supplier.lastEval}}</p></div><div><small>综合得分</small><b>{{supplier.score??'暂无'}}</b></div></div>
              <Card title="基础档案"><div class="profile-fields"><div v-for="x in selectedSupplierProfile?.profile_fields||[]" :key="x.label"><small>{{x.label}}</small><span>{{x.value}}</span></div></div></Card>
              <div><div class="stat-grid four"><Stat label="关联采购金额" :value="'¥'+(selectedSupplierProfile?.statistics.purchase_amount||0).toLocaleString()" sub="按已记录价格 × 数量"/><Stat label="订单完成率" :value="selectedSupplierProfile?.statistics.order_completion_rate==null?'暂无':selectedSupplierProfile.statistics.order_completion_rate+'%'" tone="green"/><Stat label="质检合格率" :value="selectedSupplierProfile?.statistics.quality_pass_rate==null?'暂无':selectedSupplierProfile.statistics.quality_pass_rate+'%'" tone="green"/><Stat label="风险等级" :value="supplier.risk+'风险'" :tone="supplier.risk==='低'?'green':'amber'"/></div><Card title="生命周期事件记录"><div class="timeline"><div v-for="e in selectedSupplierProfile?.supplier.lifecycle_events||[]" :class="e.status"><i></i><small>{{e.date}}</small><span>{{e.event}}</span></div></div></Card></div>
            </div>
          </div>
          </template>
          <template v-else-if="active==='profile' && profileSub==='capacity'"><Divider label="供应能力"/><div class="supplier-layout"><aside class="supplier-list"><div class="search-mode"><button class="active">当前供应商</button></div><div class="supplier-scroll"><button v-for="s in supplierList" :class="{active:supplierId===s.id}" @click="selectSupplier(s.id)"><small>{{s.id}}</small><b>{{s.name}}</b><small>{{s.category}}</small></button></div></aside><div class="supplier-detail"><div class="supplier-head"><div><h2>{{supplier.name}}</h2><p>{{supplier.id}} · {{supplier.region}} · {{supplier.category}}</p></div><div><small>关联物料数</small><b>{{selectedSupplierProfile?.materials.length||0}}</b></div></div><Card title="供应物料"><DataBox title="物料供货明细" :headers="['物料编号','零部件名称','物料分类','供货状态','最近订单日期']" :rows="(selectedSupplierProfile?.materials||[]).map(x=>[x.material_id,x.material_name,x.material_category,x.supplier_status,x.last_order_date])"/></Card></div></div></template>
          <template v-else-if="active==='profile' && profileSub==='delivery'"><Divider label="履约分析"/><div class="stat-grid four"><Stat label="订单确认时效（均）" :value="selectedSupplierProfile?.statistics.average_confirmation_days===null?'暂无':selectedSupplierProfile?.statistics.average_confirmation_days+'天'"/><Stat label="准时交付率" :value="selectedSupplierProfile?.statistics.on_time_delivery_rate===null?'暂无':selectedSupplierProfile?.statistics.on_time_delivery_rate+'%'" tone="green"/><Stat label="逾期订单数" :value="(selectedSupplierProfile?.statistics.overdue_order_count||0)+'单'" tone="amber"/><Stat label="平均到货周期" :value="selectedSupplierProfile?.statistics.arrival_cycle_days===null?'暂无':selectedSupplierProfile?.statistics.arrival_cycle_days+'天'"/></div><DataBox title="供应商订单履约明细" :headers="['订单号','物料编号','预计交期','实际交期','状态','交货比例']" :rows="(selectedSupplierProfile?.orders||[]).map(x=>[x.order_id,x.material_id,x.expected_delivery_date,x.actual_delivery_date||'-',x.status,x.delivery_ratio])"/></template>
          <template v-else-if="active==='profile' && profileSub==='credit'"><Divider label="信用风险"/><div class="stat-grid three"><Stat label="质量保证金余额" :value="'¥'+(selectedSupplierProfile?.credit.deposit_amount||0).toLocaleString()"/><Stat label="本月变动" :value="(selectedSupplierProfile?.credit.monthly_change>0?'+':'')+'¥'+(selectedSupplierProfile?.credit.monthly_change||0).toLocaleString()" :tone="selectedSupplierProfile?.credit.monthly_change>=0?'green':'amber'"/><Stat label="累计扣款（本年）" :value="'¥'+(selectedSupplierProfile?.credit.annual_deduction||0).toLocaleString()" tone="amber"/></div></template>
          <template v-else-if="active==='profile' && profileSub==='quality'"><Divider label="质量管理"/><div class="stat-grid four"><Stat label="来料批次合格率" :value="selectedSupplierProfile?.statistics.quality_pass_rate===null?'暂无':selectedSupplierProfile?.statistics.quality_pass_rate+'%'" tone="green"/><Stat label="PPM（百万缺陷率）" :value="selectedSupplierProfile?.statistics.ppm===null?'暂无':selectedSupplierProfile?.statistics.ppm" tone="green"/><Stat label="退货批次率" :value="selectedSupplierProfile?.statistics.return_batch_rate===null?'暂无':selectedSupplierProfile?.statistics.return_batch_rate+'%'"/><Stat label="8D整改闭环率" :value="selectedSupplierProfile?.statistics.eight_d_closure_rate===null?'暂无':selectedSupplierProfile?.statistics.eight_d_closure_rate+'%'" tone="green"/></div><DataBox title="来料质检记录" :headers="['批次号','物料编号','检验日期','检验数量','缺陷数量','结论','8D状态']" :rows="(selectedSupplierProfile?.quality||[]).map(x=>[x.batch_id,x.material_id,x.inspection_date,x.inspected_quantity,x.defect_quantity,x.conclusion,x.eight_d_status])"/></template>
        </section>

        <section v-else-if="active==='rating'" class="page-stack">
          <Divider label="供应商评级整体分析" :hot="role==='公司管理层'" :role="role"/>
          <div class="stat-grid five"><Stat label="已评级供应商" :value="D.ratingSummary.total+'家'"/><Stat label="A级供应商" :value="D.ratingSummary.counts.A+'家'" tone="green"/><Stat label="B级供应商" :value="D.ratingSummary.counts.B+'家'" tone="blue"/><Stat label="C/D级" :value="(D.ratingSummary.counts.C+D.ratingSummary.counts.D)+'家'" tone="amber"/><Stat label="整体平均分" :value="D.ratingSummary.averageScore.toFixed(1)"/></div>
          <div class="grid two"><Card title="等级分布"><div class="donut-row"><div class="donut" :style="fullRatingDonutStyle" :data-total="D.ratingSummary.total"></div><div class="legend"><div v-for="r in D.ratingDistribution"><i :style="{background:r.color}"></i><span>{{r.level}}</span><b>{{r.count}}家</b></div></div></div></Card><BarBox title="综合得分排名" :values="ratingList.map(s=>s.score)" :labels="ratingList.map(s=>s.name.slice(0,5))"/></div>
          <Divider label="单个供应商评级查询" :hot="role==='中层管理层'" :role="role"/>
          <div class="query-panel"><input v-model="ratingSearch" placeholder="供应商名称 / 编号"><select v-model="supplierId"><option v-for="s in ratingList" :value="s.id">{{s.id}} · {{s.name}}</option></select><button>查询</button></div>
          <div class="rating-result"><div class="rating-score"><small>综合评级</small><b>{{supplier.level}}</b><strong>{{supplier.score}}</strong><span>/ 100分</span></div><div class="dimension-list"><div v-for="d in dims"><span>{{d[0]}}</span><i><b :style="{width:(d[1]/d[2]*100)+'%'}"></b></i><strong>{{d[1]}} / {{d[2]}}</strong></div></div></div>
          <DataBox title="评级结果明细" :headers="['供应商','分类','评级','得分','最近评审']" :rows="ratingList.map(s=>[s.name,s.category,s.level+'级',s.score,s.lastEval])"/>
        </section>

        <section v-else-if="active==='delivery'" class="page-stack">
          <Divider label="采购交付整体监控" :hot="role==='公司管理层'" :role="role"/>
          <div class="stat-grid six"><Stat label="在途订单" :value="D.deliverySummary.inTransitCount+'单'"/><Stat label="准时交付率" :value="D.deliverySummary.onTimeRate===null?'暂无':D.deliverySummary.onTimeRate.toFixed(1)+'%'" tone="green"/><Stat label="异常订单" :value="D.deliverySummary.exceptionCount+'单'" tone="amber"/><Stat label="逾期未交" :value="D.deliverySummary.overdueCount+'单'" tone="red"/><Stat label="平均到货周期" :value="D.deliverySummary.averageReceiptDays.toFixed(1)+'天'"/><Stat label="缺料风险" :value="D.deliverySummary.shortageCount+'项'" :sub="'高风险 '+D.deliverySummary.highRiskShortageCount+'项'" tone="red"/></div>
          <Card title="订单全链路跟踪统计"><div class="pipeline"><div v-for="(p,i) in D.pipeline" :key="p[0]" class="pipeline-step"><div class="pipeline-node">{{p[2]}}</div><b>{{p[0]}}</b><small>{{p[1]}}</small><i v-if="i<D.pipeline.length-1" class="pipeline-arrow">›</i></div></div></Card>
          <DataBox title="异常订单监控" :headers="['订单号','物料编号','物料名称','供应商','供货比例','交付比例','预计交期','实际交期','交付偏差','订单状态']" :rows="D.anomalies"/>
          <Divider label="订单明细查询" :hot="role==='中层管理层'" :role="role"/>
          <Tabs :items="['订单列表','交付履约分析','缺件分析','供货比例执行']" v-model="deliveryTab"/>
          <DataBox v-if="deliveryTab===0" title="订单明细" :headers="['订单号','物料编号','物料名称','供应商','供货比例','预计交期','状态','交付偏差']" :rows="D.orders.map(x=>x.slice(0,8))"/>
          <div v-else-if="deliveryTab===1" class="grid two delivery-analysis">
            <Card title="各环节周期趋势（天）"><MiniChart :rows="D.deliveryStats.map(x=>({month:x.period,confirm:x.confirmDays,inspect:x.inspectDays,inbound:x.inboundDays}))" :series="[['confirm','#3b82f6'],['inspect','#06b6d4'],['inbound','#22c55e']]"/><div class="delivery-legend"><span><i class="confirm"></i>确认时效</span><span><i class="inspect"></i>检验周期</span><span><i class="inbound"></i>入库周期</span></div></Card>
            <BarBox title="逾期订单率趋势" :values="D.deliveryStats.map(x=>x.overduePct)" :labels="D.deliveryStats.map(x=>x.period.slice(5))" tone="amber" suffix="%"/>
          </div>
          <DataBox v-else-if="deliveryTab===2" title="缺件预警明细" :headers="['物料','物料编码','未完成订单数','库存金额','供货天数','风险依据','预计交期','缺件供应商','风险']" :rows="D.shortages"/>
          <div v-else class="grid two"><BarBox title="订单交付比例" :values="D.orders.map(x=>Number.parseFloat(x[8])||0)" :labels="D.orders.map(x=>x[0])" suffix="%"/><DataBox title="供货比例执行明细" :headers="['供应商','物料','订单供货比例','实际交付比例','交付偏差','订单状态']" :rows="D.orders.map(x=>[x[3],x[1],x[4],x[8],x[7],x[6]])"/></div>
        </section>

        <section v-else class="page-stack">
          <Tabs :items="['历史成交价查询','多供应商比价','成本因素分析']" v-model="priceTab"/>
          <div class="query-panel"><label>物料<select v-model="selectedMaterial"><option v-for="(m,i) in D.materials" :value="i">{{m[1]}}</option></select></label></div>
          <template v-if="priceTab===0"><div class="stat-grid four"><Stat label="最近成交价" :value="selectedPriceSummary?'¥'+selectedPriceSummary.latest.unit_price.toFixed(2):'暂无'" :sub="selectedPriceSummary?.latest.record_date||''"/><Stat label="最低价（当前样本）" :value="selectedPriceSummary?'¥'+selectedPriceSummary.minimum.toFixed(2):'暂无'" tone="green"/><Stat label="最高价（当前样本）" :value="selectedPriceSummary?'¥'+selectedPriceSummary.maximum.toFixed(2):'暂无'" tone="amber"/><Stat label="加权平均价" :value="selectedPriceSummary?'¥'+selectedPriceSummary.weightedAverage.toFixed(2):'暂无'" sub="按采购数量加权"/></div><Card :title="D.materials[selectedMaterial]?.[1]+' · 成交价格记录'" :sub="D.materials[selectedMaterial]?.[2]"><DataBox title="原始价格记录" :headers="['日期','供应商','成交价','采购数量']" :rows="(selectedPriceSummary?.records||[]).map(x=>[x.record_date,x.supplier_name,'¥'+x.unit_price.toFixed(2),x.purchase_qty])"/></Card><div class="grid two"><DataBox title="价格样本统计" :headers="['指标','结果','计算依据']" :rows="[['当前样本数',selectedPriceSummary?.records.length||0,'所选物料的价格记录'],['采购数量合计',(selectedPriceSummary?.records||[]).reduce((sum,x)=>sum+x.purchase_qty,0),'价格记录数量之和'],['供应商数',new Set((selectedPriceSummary?.records||[]).map(x=>x.supplier_id)).size,'所选物料的去重供应商']]"/><DataBox title="供应商成交价记录" :headers="['采购数量','单价']" :rows="(selectedPriceSummary?.records||[]).map(x=>[x.purchase_qty,'¥'+x.unit_price.toFixed(2)])"/></div></template>
          <template v-else-if="priceTab===1"><BarBox title="所选物料成交价对比" :values="selectedPriceComparison.map(x=>x[2])" :labels="selectedPriceComparison.map(x=>x[0].slice(0,5))"/><DataBox title="多供应商成交价明细" :headers="['供应商','物料','成交价','基准价','偏差','采购数量','质量合格率','时间遵守率']" :rows="selectedPriceComparison.map(x=>[x[0],x[1],'¥'+x[2].toFixed(2),'¥'+x[3].toFixed(2),x[4]+'%',x[5],x[6],x[7]])"/></template>
          <template v-else><DataBox title="所选物料成交价差估算" :headers="['供应商与物料','推算基准价','执行价差','偏差率','口径']" :rows="selectedCostFactors.map(x=>[x[0],'¥'+x[1].toFixed(2),(x[2]>0?'+':'')+'¥'+x[2].toFixed(2),x[3],x[4]])"/></template>
        </section>
      </main>
    </div>
  </div>`,
  components:{
    Stat:{props:['label','value','sub','tone'],template:'<div :class="[\'stat\',tone]"><small>{{label}}</small><b>{{value}}</b><span v-if="sub">{{sub}}</span></div>'},
    Divider:{props:['label','hot','role'],template:'<div :class="[\'divider\',{hot}]"><i></i><b>{{label}}</b></div>'},
    Card:{props:['title','sub'],template:'<article class="figma-card"><header><div><b>{{title}}</b><small v-if="sub">{{sub}}</small></div></header><section><slot/></section></article>'},
    Badge:{props:['text','tone'],template:'<em :class="[\'badge\',tone]">{{text}}</em>'},
    Tabs:{props:['items','modelValue'],emits:['update:modelValue'],template:'<div class="figma-tabs"><button v-for="(x,i) in items" :class="{active:modelValue===i}" @click="$emit(\'update:modelValue\',i)">{{x}}</button></div>'},
    DataBox:{props:['title','headers','rows'],template:'<article class="data-box"><header>{{title}}</header><div><table><thead><tr><th v-for="h in headers">{{h}}</th></tr></thead><tbody><tr v-for="r in rows"><td v-for="v in r"><span>{{v}}</span></td></tr></tbody></table></div></article>'},
    MiniChart:{props:['rows','series'],computed:{points(){const all=this.series.flatMap(s=>this.rows.map(r=>Number(r[s[0]])));const mn=Math.min(...all),mx=Math.max(...all),range=mx-mn||1;return this.series.map(s=>({color:s[1],p:this.rows.map((r,i)=>`${18+i*(360/(this.rows.length-1||1))},${112-(Number(r[s[0]])-mn)/range*88}`).join(' ')}))}},template:'<div class="mini-chart"><svg viewBox="0 0 396 130" preserveAspectRatio="none"><g class="grid-lines"><line v-for="y in [24,46,68,90,112]" x1="18" :y1="y" x2="378" :y2="y"/></g><polyline v-for="p in points" :points="p.p" :stroke="p.color"/></svg><div><span v-for="r in rows">{{r.month}}</span></div></div>'},
    BarBox:{props:['title','values','labels','tone','suffix'],template:'<article class="figma-card"><header><div><b>{{title}}</b></div></header><section :class="[\'bars-chart\',tone]"><div v-for="(v,i) in values"><i><b :style="{height:(v/Math.max(...values)*100)+\'%\'}"></b></i><span>{{labels?.[i]||v}}</span><small>{{labels?v+(suffix||\'\'):\'\'}}</small></div></section></article>'},
    Radar:{template:'<article class="figma-card"><header><div><b>能力雷达对比</b></div></header><section class="radar"><svg viewBox="0 0 240 210"><g><polygon points="120,15 218,86 181,196 59,196 22,86"/><polygon points="120,42 190,93 164,171 76,171 50,93"/><polygon points="120,70 162,100 146,147 94,147 78,100"/><line x1="120" y1="105" x2="120" y2="15"/><line x1="120" y1="105" x2="218" y2="86"/><line x1="120" y1="105" x2="181" y2="196"/><line x1="120" y1="105" x2="59" y2="196"/><line x1="120" y1="105" x2="22" y2="86"/></g><polygon class="radar-a" points="120,20 205,89 171,181 70,179 26,88"/><polygon class="radar-b" points="120,32 194,92 166,175 65,187 37,91"/></svg></section></article>'}
  }
}).mount('#app');
