import {createRouter,createWebHashHistory} from 'vue-router';
export default createRouter({history:createWebHashHistory(),routes:[
  {path:'/',redirect:'/profile'},
  {path:'/profile',component:()=>import('../views/UnifiedScreen.vue'),meta:{module:'profile'}},
  {path:'/delivery',component:()=>import('../views/UnifiedScreen.vue'),meta:{module:'delivery'}},
  {path:'/profile/:pathMatch(.*)*',redirect:'/profile'},
  {path:'/delivery/:pathMatch(.*)*',redirect:'/delivery'},
  {path:'/rating',redirect:'/profile'},
  {path:'/price',redirect:'/delivery'},
  {path:'/:pathMatch(.*)*',redirect:'/profile'}
]});
