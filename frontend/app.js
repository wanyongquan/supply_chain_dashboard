const { createApp, ref, computed, onMounted } = Vue;
const D = ref(window.SupplierApi.emptyModel());

const NAV = [
  {id:'profile',label:'供应商画像',sub:'全生命周期·风险预警',icon:'◉'},
  {id:'rating',label:'供应商评级',sub:'综合评级·模型管理',icon:'☆'},
  {id:'delivery',label:'采购交付',sub:'全链路跟踪·异常监控',icon:'⇄'},
  {id:'price',label:'比价分析',sub:'历史价格·成本因素',icon:'▥'}
];

createApp({
  setup(){
    const active=ref('profile'), role=ref('公司管理层'), alertOpen=ref(true);
    const apiError=ref('');
    const supplierId=ref('S001'), detailTab=ref(0), priceTab=ref(0), deliveryTab=ref(0), searchMode=ref('name'), search=ref(''), ratingSearch=ref(''), selectedMaterial=ref(0);
    const compareIds=ref(['S001','S002']);
    const current=computed(()=>NAV.find(n=>n.id===active.value));
    const supplier=computed(()=>D.value.suppliers.find(s=>s.id===supplierId.value)||D.value.suppliers[0]);
    const supplierList=computed(()=>D.value.suppliers.filter(s=>!search.value||(searchMode.value==='name'?s.name.includes(search.value):s.id.toLowerCase().includes(search.value.toLowerCase()))));
    const ratingList=computed(()=>D.value.suppliers.filter(s=>!ratingSearch.value||`${s.name}${s.id}`.includes(ratingSearch.value)).sort((a,b)=>b.score-a.score));
    const dims=computed(()=>{const v=D.value.dimensionScores[supplierId.value]||[0,0,0,0,0];return [['质量',v[0],45],['交付',v[1],30],['技术',v[2],16],['成本',v[3],7],['廉洁合作',v[4],2]]});
    const selectSupplier=id=>{supplierId.value=id;detailTab.value=0};
    const toggleCompare=id=>{const a=compareIds.value;a.includes(id)?compareIds.value=a.filter(x=>x!==id):a.length<4&&a.push(id)};
    onMounted(async()=>{
      try { D.value=await window.SupplierApi.loadModel(); }
      catch (error) { apiError.value=error.message; }
    });
    return {D,NAV,active,role,alertOpen,apiError,supplierId,detailTab,priceTab,deliveryTab,searchMode,search,ratingSearch,selectedMaterial,compareIds,current,supplier,supplierList,ratingList,dims,selectSupplier,toggleCompare};
  },
  template:`
  <div class="figma-app">
    <div v-if="apiError" class="figma-alert"><b>数据接口异常</b><span>{{apiError}}</span></div>
    <header class="figma-top">
      <div class="figma-brand"><span>◈</span><div><b>供应链数据中台</b><small>Supplier Intelligence Platform</small></div></div>
      <div class="top-actions"><small>数据更新：2026-09-12 08:30</small><button class="alert-pill" @click="alertOpen=!alertOpen">⚠ 3 条预警</button><select v-model="role"><option>公司管理层</option><option>中层管理层</option></select><i>采</i></div>
    </header>
    <div v-if="alertOpen" class="figma-alert"><b>风险预警</b><span><i></i>苏州欧睿精密仪器 PPM连续超标3个月</span><span><i></i>PO2026-08398 深圳华联订单3天未确认</span><span><i></i>精密轴承 6205-2RS 库存低于安全线</span><button @click="alertOpen=false">×</button></div>
    <div :class="['viewbar',role==='公司管理层'?'blue':'purple']"><b>当前视角：{{role}}</b><span>— {{role==='公司管理层'?'优先展示公司层面整体统计与分析':'优先关注日常操作明细与查询功能'}}</span></div>
    <div class="app-workspace">
      <aside class="figma-sidebar"><div class="side-caption">供应链主题看板</div><button v-for="n in NAV" :class="{active:active===n.id}" @click="active=n.id"><i>{{n.icon}}</i><span><b>{{n.label}}</b><small>{{n.sub}}</small></span></button><div class="side-status"><b>数据源状态</b><span><i></i>ERP / SRM / WMS / QMS 已接入</span><small>最近同步 08:30</small></div></aside>
      <main class="figma-main"><div class="page-heading"><div><h1>{{current.label}}</h1><p>{{current.sub}}</p></div></div>

        <section v-if="active==='profile'" class="page-stack">
          <Divider label="整体供应商统计概览" :hot="role==='公司管理层'" :role="role"/>
          <div class="stat-grid six"><Stat label="供应商总数" value="68家"/><Stat label="活跃供应商" value="52家" sub="占比 76.5%" tone="green"/><Stat label="预警供应商" value="8家" sub="需及时关注" tone="amber"/><Stat label="整体平均得分" value="81.3分" sub="较上期 +1.2"/><Stat label="平均准时交付率" value="94.8%" sub="近6个月" tone="green"/><Stat label="平均批次合格率" value="96.2%" sub="近6个月" tone="green"/></div>
          <div class="grid profile-overview"><Card title="供应商等级分布"><div class="donut-row"><div class="donut"></div><div class="legend"><div v-for="r in D.ratingDistribution"><i :style="{background:r.color}"></i><span>{{r.level}}</span><b :style="{color:r.color}">{{r.count}}家</b></div></div></div></Card><Card title="整体履约与质量趋势（近6个月均值）"><MiniChart :rows="D.overallTrend" :series="[['onTime','#3b82f6'],['quality','#06b6d4']]"/><div class="chart-legend"><i class="blue"></i>平均准时率 <i class="cyan"></i>平均合格率</div></Card></div>
          <Divider label="供应商查询与单体画像" :hot="role==='中层管理层'" :role="role"/>
          <div class="supplier-layout"><aside class="supplier-list"><div class="search-mode"><button :class="{active:searchMode==='name'}" @click="searchMode='name'">按名称</button><button :class="{active:searchMode==='id'}" @click="searchMode='id'">按编号</button></div><input v-model="search" :placeholder="searchMode==='name'?'输入名称关键词...':'如 S001'"><div class="supplier-scroll"><button v-for="s in supplierList" :class="{active:supplierId===s.id}" @click="selectSupplier(s.id)"><div><small>{{s.id}}</small><Badge :text="s.level+'级'" :tone="s.level"/></div><b>{{s.name}}</b><div><small>{{s.category}}</small><Badge :text="s.status" :tone="s.status"/></div></button></div></aside>
            <div class="supplier-detail"><div class="supplier-head"><div><h2>{{supplier.name}} <Badge :text="supplier.level+'级'" :tone="supplier.level"/> <Badge :text="supplier.status" :tone="supplier.status"/></h2><p>{{supplier.id}} · {{supplier.category}} · {{supplier.region}} · 最近评审 {{supplier.lastEval}}</p></div><div><small>综合得分</small><b>{{supplier.score}}</b></div></div>
              <Card title="基础档案"><div class="profile-fields"><div v-for="x in [['统一社会信用代码','91330200XXXXXXXX4K'],['注册地址','浙江省宁波市鄞州区'],['成立时间','2008-11-23'],['注册资本','5000万元人民币'],['主营业务','精密机械零部件制造'],['认证资质','ISO 9001、IATF 16949'],['联系人','张建国（采购对接）'],['联系电话','0574-8765XXXX'],['准入日期','2024-03-12'],['供应商类型','战略供应商'],['付款周期','月结60天'],['合同有效期','2024-03-12 至 2027-03-11']]" :key="x[0]"><small>{{x[0]}}</small><span>{{x[1]}}</span></div></div></Card>
              <Tabs :items="['画像总览','履约分析','质量风险','信用风险','供应商对比']" v-model="detailTab"/>
              <div v-if="detailTab===0"><div class="stat-grid four"><Stat label="累计采购金额" value="¥2,847万" sub="近12个月"/><Stat label="订单完成率" value="97.2%" tone="green"/><Stat label="综合质量合格率" value="96.8%" tone="green"/><Stat label="风险等级" :value="supplier.risk+'风险'" :tone="supplier.risk==='低'?'green':'amber'"/></div><Card title="生命周期事件记录"><div class="timeline"><div v-for="e in D.lifecycle" :class="e[2]"><i></i><small>{{e[0]}}</small><span>{{e[1]}}</span></div></div></Card></div>
              <div v-else-if="detailTab===1"><div class="stat-grid four"><Stat label="订单确认时效（均）" value="1.8天" sub="目标≤2天" tone="green"/><Stat label="准时交付率" value="95.8%" tone="green"/><Stat label="逾期订单数" value="3单" tone="amber"/><Stat label="到货-入库周期" value="4.2天"/></div><Card title="履约趋势（近6个月）"><MiniChart :rows="D.overallTrend" :series="[['onTime','#3b82f6'],['quality','#06b6d4']]"/></Card><DataBox title="逾期订单明细" :headers="['订单号','物料','约定交期','逾期天数','状态']" :rows="[['PO2026-07891','精密轴承 6205-2RS','2026-09-02','10天','逾期未发'],['PO2026-08104','弹簧销 M6×20','2026-09-05','7天','在途'],['PO2026-08312','铝合金锻件 φ80','2026-09-05','7天','逾期未发']]"/></div>
              <div v-else-if="detailTab===2"><div class="stat-grid four"><Stat label="来料批次合格率" value="96.8%" tone="green"/><Stat label="PPM（百万缺陷率）" value="201" tone="green"/><Stat label="验退率" value="0.7%"/><Stat label="8D整改闭环率" value="100%" tone="green"/></div><div class="grid two"><BarBox title="PPM趋势" :values="[312,445,268,521,289,201]"/><Card title="批次合格率趋势"><MiniChart :rows="D.overallTrend" :series="[['quality','#06b6d4']]"/></Card></div></div>
              <div v-else-if="detailTab===3"><div class="stat-grid three"><Stat label="质量保证金余额" value="¥11.2万"/><Stat label="本月变动" value="+¥0.7万" tone="green"/><Stat label="累计扣款（本年）" value="¥0.8万" tone="amber"/></div><Card title="质量保证金余额趋势"><MiniChart :rows="D.overallTrend" :series="[['quality','#3b82f6']]"/></Card></div>
              <div v-else><Card title="选择对比供应商（最多4家）"><div class="compare-picks"><button v-for="s in D.suppliers" :class="{active:compareIds.includes(s.id)}" @click="toggleCompare(s.id)">{{s.name.slice(0,6)}}</button></div></Card><div class="grid two"><Radar/><DataBox title="供应商对比" :headers="['指标',...compareIds.slice(0,2).map(id=>D.suppliers.find(s=>s.id===id).name.slice(0,6))]" :rows="[['评级','A级','A级'],['得分','92.4','89.7'],['状态','活跃','活跃'],['风险','低风险','低风险'],['准时率','95.8%','92.3%'],['合格率','96.8%','94.2%'],['PPM','201','378']]"/></div></div>
            </div>
          </div>
        </section>

        <section v-else-if="active==='rating'" class="page-stack">
          <Divider label="供应商评级整体分析" :hot="role==='公司管理层'" :role="role"/>
          <div class="stat-grid five"><Stat label="已评级供应商" value="68家"/><Stat label="A级供应商" value="18家" sub="占比 26.5%" tone="green"/><Stat label="B级供应商" value="34家" sub="占比 50.0%" tone="blue"/><Stat label="C/D级" value="16家" sub="需改进" tone="amber"/><Stat label="整体平均分" value="81.3" sub="较上期 +1.2"/></div>
          <div class="grid two"><Card title="等级分布"><div class="donut-row"><div class="donut"></div><div class="legend"><div v-for="r in D.ratingDistribution"><i :style="{background:r.color}"></i><span>{{r.level}}</span><b>{{r.count}}家</b></div></div></div></Card><BarBox title="综合得分排名" :values="ratingList.map(s=>s.score)" :labels="ratingList.map(s=>s.name.slice(0,5))"/></div>
          <Divider label="单个供应商评级查询" :hot="role==='中层管理层'" :role="role"/>
          <div class="query-panel"><input v-model="ratingSearch" placeholder="供应商名称 / 编号"><select v-model="supplierId"><option v-for="s in ratingList" :value="s.id">{{s.id}} · {{s.name}}</option></select><button>查询</button></div>
          <div class="rating-result"><div class="rating-score"><small>综合评级</small><b>{{supplier.level}}</b><strong>{{supplier.score}}</strong><span>/ 100分</span></div><div class="dimension-list"><div v-for="d in dims"><span>{{d[0]}}</span><i><b :style="{width:(d[1]/d[2]*100)+'%'}"></b></i><strong>{{d[1]}} / {{d[2]}}</strong></div></div></div>
          <div class="grid two"><Card title="评级趋势（2024-H1 至 2026-H1）"><MiniChart :rows="D.ratingTrend.map((x,i)=>({month:['24-H1','24-H2','25-H1','25-H2','26-H1'][i],score:x}))" :series="[['score','#3b82f6']]"/></Card><DataBox title="评级结果明细" :headers="['供应商','分类','评级','得分','最近评审']" :rows="ratingList.map(s=>[s.name,s.category,s.level+'级',s.score,s.lastEval])"/></div>
        </section>

        <section v-else-if="active==='delivery'" class="page-stack">
          <Divider label="采购交付整体监控" :hot="role==='公司管理层'" :role="role"/>
          <div class="stat-grid six"><Stat label="在途订单" value="248单" sub="金额 ¥1,842万"/><Stat label="准时交付率" value="94.8%" sub="近30天" tone="green"/><Stat label="异常订单" value="12单" sub="占比 4.8%" tone="amber"/><Stat label="逾期未交" value="7单" tone="red"/><Stat label="平均到货周期" value="12.4天"/><Stat label="缺料风险" value="5项" sub="高风险 2项" tone="red"/></div>
          <Card title="订单全链路跟踪统计"><div class="pipeline"><div v-for="(p,i) in D.pipeline" :key="p[0]" class="pipeline-step"><div class="pipeline-node">{{p[2]}}</div><b>{{p[0]}}</b><small>{{p[1]}}</small><i v-if="i<D.pipeline.length-1" class="pipeline-arrow">›</i></div></div></Card>
          <DataBox title="异常订单监控" :headers="['订单号','物料编号','物料名称','供应商','订购数量','已收数量','需求日期','预计到货','逾期','异常类型']" :rows="D.anomalies"/>
          <Divider label="订单明细查询" :hot="role==='中层管理层'" :role="role"/>
          <Tabs :items="['订单列表','交付履约分析','缺件分析','供货比例执行']" v-model="deliveryTab"/>
          <DataBox v-if="deliveryTab===0" title="订单明细" :headers="['订单号','物料编号','物料名称','供应商','数量','ETA','状态','当前节点']" :rows="D.orders"/>
          <div v-else-if="deliveryTab===1" class="grid two delivery-analysis">
            <Card title="各环节周期趋势（天）"><MiniChart :rows="D.deliveryStats.map(x=>({month:x.period,confirm:x.confirmDays,inspect:x.inspectDays,inbound:x.inboundDays}))" :series="[['confirm','#3b82f6'],['inspect','#06b6d4'],['inbound','#22c55e']]"/><div class="delivery-legend"><span><i class="confirm"></i>确认时效</span><span><i class="inspect"></i>检验周期</span><span><i class="inbound"></i>入库周期</span></div></Card>
            <BarBox title="逾期订单率趋势" :values="D.deliveryStats.map(x=>x.overduePct)" :labels="D.deliveryStats.map(x=>x.period.slice(5))" tone="amber" suffix="%"/>
          </div>
          <DataBox v-else-if="deliveryTab===2" title="缺件预警明细" :headers="['物料','物料编码','在途数量','可用库存','安全库存','缺口','预计到货','缺件供应商','风险']" :rows="D.shortages"/>
          <div v-else class="grid two"><BarBox title="供货比例执行对比" :values="[35,34,36,28,29,27,20,19,18,17,18,19]"/><DataBox title="供货比例执行明细" :headers="['供应商','协议比例','订单比例','实际到货比例','偏差','状态']" :rows="[['宁波精工','35%','34%','36%','+1%','正常'],['深圳华联','28%','29%','27%','-1%','正常'],['成都恒达','20%','19%','18%','-2%','正常'],['天津航空','17%','18%','19%','+2%','正常']]"/></div>
        </section>

        <section v-else class="page-stack">
          <Tabs :items="['历史成交价查询','多供应商比价','成本因素分析']" v-model="priceTab"/>
          <div class="query-panel"><label>物料<select v-model="selectedMaterial"><option v-for="(m,i) in D.materials" :value="i">{{m[1]}}</option></select></label><label>供应商<select><option>全部供应商</option><option>宁波精工零部件</option></select></label><label>时间范围<select><option>近12个月</option><option>近24个月</option></select></label><button>查询</button></div>
          <template v-if="priceTab===0"><div class="stat-grid four"><Stat label="最近成交价" value="¥12.50" sub="2026-08-20"/><Stat label="最低价（近12月）" value="¥11.80" sub="2026-03-15" tone="green"/><Stat label="最高价（近12月）" value="¥13.40" sub="2026-04-08" tone="amber"/><Stat label="平均价" value="¥12.56" sub="近12个月加权"/></div><Card :title="D.materials[selectedMaterial][1]+' · 历史成交价趋势'" :sub="D.materials[selectedMaterial][2]"><MiniChart :rows="D.priceHistory.map(x=>({month:x[0],a:x[1],b:x[2],c:x[3],avg:x[4]}))" :series="[['a','#3b82f6'],['b','#06b6d4'],['c','#22c55e'],['avg','#64748b']]"/></Card><div class="grid two"><DataBox title="同比环比分析" :headers="['指标','变动','说明']" :rows="[['环比','-3.1%','较上月下降'],['同比','+1.8%','较去年同期上升'],['近6月振幅','8.6%','价格波动可控']]"/><DataBox title="数量阶梯价（宁波精工）" :headers="['采购数量','单价']" :rows="D.volumePricing.map(x=>[x[0],'¥'+x[1].toFixed(2)])"/></div></template>
          <template v-else-if="priceTab===1"><BarBox title="报价偏差对比（基准价：¥12.80）" :values="D.priceComparison.map(x=>x[1])" :labels="D.priceComparison.map(x=>x[0].slice(0,5))"/><DataBox title="多供应商报价对比明细" :headers="['供应商','报价','基准价','偏差','MOQ','交期（天）','包装方式','IATF认证']" :rows="D.priceComparison.map(x=>[x[0],'¥'+x[1].toFixed(2),'¥'+x[2].toFixed(2),x[3]+'%',x[4],x[5],x[6],x[7]])"/></template>
          <template v-else><div class="grid two"><DataBox title="价格影响因素分析" :headers="['影响因素','基准价','金额影响','影响比例','说明']" :rows="D.costFactors.map(x=>[x[0],'¥'+x[1].toFixed(2),(x[2]>0?'+':'')+'¥'+x[2].toFixed(2),x[3],x[4]])"/><BarBox title="交货周期 vs 价格影响" :values="[13.7,13.2,12.8,12.3,11.9]" :labels="['7天','10天','14天','21天','28天']"/></div><div class="formula">基准执行价 <b>¥12.80</b><span>+</span>包装费 <b>¥0.32</b><span>-</span>数量折扣 <b>¥0.64</b><span>+</span>加急费 <b>¥0.90</b><span>=</span><strong>综合参考价 ¥13.38</strong></div></template>
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
