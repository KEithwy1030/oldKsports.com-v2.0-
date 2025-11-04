// Lightweight singleton hover card rendered with plain DOM APIs
// Shows basic user info near the hovered element

import { userAPI } from '../utils/api';
import { INDUSTRY_ROLES, USER_LEVELS } from '../data/constants';

type CachedUser = {
  id?: number; // 用户ID
  username: string;
  avatar?: string | null;
  role?: string | null; // 身份：主播/甲方/服务商等
  roles?: string[] | null; // 身份数组（JSON字段）
  level?: { name: string; color: string } | null; // 等级对象
  points?: number; // 积分
  joinDate?: string; // 加入时间
};

type CacheEntry = { data: CachedUser; fetchedAt: number };
const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<CachedUser>>();
let lastNetworkAt = 0;
const CACHE_TTL_MS = 60 * 1000; // 1分钟
const MIN_REQUEST_GAP_MS = 150; // 相邻请求间隔

// 清除特定用户的缓存
export function clearUserCache(username: string) {
  cache.delete(username);
  inFlight.delete(username);
}

// 清除所有缓存
export function clearAllUserCache() {
  cache.clear();
  inFlight.clear();
}

let container: HTMLDivElement | null = null;
let hideTimer: any = null;
let initialDisplayTimer: any = null; // 保留变量名以兼容内联清理
let intentTimer: any = null; // 新：基于意图的延迟定时器
const SHOW_DELAY_MS = 60; // 更快弹出
const HIDE_DELAY_MS = 120; // 更快消失
let isHoveringCard = false; // 通过事件维护的悬停状态标记
let isHoveringAnchor = false; // 头像（触发元素）悬停标记

// 获取当前登录用户ID（从本地存储）
function getCurrentUserId(): number | null {
  try {
    const raw = localStorage.getItem('oldksports_user');
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (typeof u?.id === 'number' && u.id > 0) return u.id;
    return null;
  } catch {
    return null;
  }
}

function ensureContainer() {
  if (!container) {
    console.log('🔥 创建用户卡片容器');
    container = document.createElement('div');
    container.id = 'user-hover-card';
    container.style.position = 'fixed';
    container.style.zIndex = '2147483646';
    // 容器本身不接收事件，避免遮挡页面头像的鼠标事件
    container.style.pointerEvents = 'none';
    container.style.opacity = '0';
    container.style.transform = 'translateY(6px)';
    container.style.transition = 'opacity 120ms ease, transform 120ms ease';
    document.body.appendChild(container);
    console.log('🔥 用户卡片容器已添加到DOM');
  }
  return container;
}

async function getUser(username: string, forceRefresh = false): Promise<CachedUser> {
  // 紧急防护：检查username有效性
  if (!username || username === 'undefined' || username === 'null' || username === '') {
    console.warn('🔥 getUser: 无效的用户名:', username);
    // 返回一个安全的默认用户对象
    return { 
      username: 'unknown',
      id: null,
      avatar: null,
      role: null,
      roles: null,
      level: null,
      points: 0,
      joinDate: null
    };
  }
  
  console.log('🔥 getUser 被调用:', username, forceRefresh);
  const cached = cache.get(username);
  if (!forceRefresh && cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    console.log('🔥 命中缓存(有效期内):', username);
    return cached.data;
  }
  if (inFlight.has(username)) {
    console.log('🔥 复用进行中的请求:', username);
    return inFlight.get(username)!;
  }
  const now = Date.now();
  const gap = now - lastNetworkAt;
  const waitMs = gap >= MIN_REQUEST_GAP_MS ? 0 : (MIN_REQUEST_GAP_MS - gap);

  try {
    console.log('🔥 将在', waitMs, 'ms 后请求API:', username);
    const p = (async () => {
      if (waitMs > 0) await new Promise(r => setTimeout(r, waitMs));
      lastNetworkAt = Date.now();
      console.log('🔥 从API获取用户数据:', username);
      const info = await userAPI.getUserInfo(username);
      const user = info?.user as any;
        const data: CachedUser = {
          id: user?.id,
          username,
          avatar: user?.avatar ?? null,
          role: user?.role ?? null,
          roles: user?.roles ?? null,
          level: user?.level ?? null,
          points: user?.points ?? 0,
          joinDate: user?.joinDate ?? null,
        };
        console.log('API返回的用户数据:', user);
        console.log('解析后的roles:', user?.roles);
      cache.set(username, { data, fetchedAt: Date.now() });
      console.log('🔥 用户数据已缓存:', data);
      return data;
    })();
    inFlight.set(username, p);
    const result = await p;
    inFlight.delete(username);
    return result;
  } catch (error) {
    console.error('🔥 获取用户信息失败:', error);
    const data: CachedUser = { username };
    cache.set(username, { data, fetchedAt: Date.now() });
    inFlight.delete(username);
    return data;
  }
}

function renderCard(user: CachedUser) {
  console.log('🔥 renderCard 被调用:', user);
  const el = ensureContainer();
  const currentUserId = getCurrentUserId();
  const isSelf = typeof currentUserId === 'number' && typeof user.id === 'number' && currentUserId === user.id;
  
  // 头像（居中显示）
  const avatar = user.avatar
    ? `<img src="${user.avatar}" style="width:80px;height:80px;border-radius:9999px;object-fit:cover;border:3px solid rgba(255,255,255,.3);" />`
    : `<div style="width:80px;height:80px;border-radius:9999px;background:linear-gradient(135deg,rgba(16,185,129,.3),rgba(59,130,246,.3));display:flex;align-items:center;justify-content:center;border:3px solid rgba(16,185,129,.4);color:#34d399;font-weight:700;font-size:32px;">${user.username && user.username.length > 0 ? user.username.charAt(0).toUpperCase() : '?'}</div>`;

  // 获取身份标签（只显示实际身份，预留空间）
  const getRoleTags = () => {
    const roles = [];
    console.log('用户卡片调试 - 用户数据:', user);
    console.log('用户卡片调试 - roles字段:', user.roles);
    
    // 获取用户已选择的身份
    const userRoles = user.roles && user.roles.length > 0 ? user.roles : [];
    
    // 只显示实际的身份，不显示占位符
    userRoles.forEach(roleId => {
      const role = INDUSTRY_ROLES.find(r => r.id === roleId);
      if (role) {
        roles.push(`
          <span style="display:inline-block;background:rgba(16,185,129,.2);color:#10b981;padding:4px 8px;border-radius:12px;font-size:11px;font-weight:500;border:1px solid rgba(16,185,129,.3);margin:2px;min-width:50px;text-align:center;">
            ${role.label}
          </span>
        `);
      }
    });
    
    // 如果没有身份，显示一个占位符提示
    if (roles.length === 0) {
      roles.push(`
        <span style="display:inline-block;background:rgba(107,114,128,.1);color:rgba(107,114,128,.5);padding:4px 8px;border-radius:12px;font-size:11px;font-weight:500;border:1px solid rgba(107,114,128,.2);margin:2px;min-width:50px;text-align:center;">
          未设置
        </span>
      `);
    }
    
    console.log('生成的身份标签:', roles);
    return roles.join('');
  };

  // 获取等级颜色
  const getLevelColor = () => {
    if (user.level?.name) {
      const level = USER_LEVELS.find(l => l.name === user.level?.name);
      return level ? level.color : '#6b7280';
    }
    return '#6b7280'; // 默认灰色
  };

  const levelColor = getLevelColor();

  // 格式化加入时间
  const formatJoinDate = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
    } catch {
      return '';
    }
  };

  // 私信按钮点击处理
  const handlePrivateMessage = () => {
    // 这里可以添加私信逻辑
    console.log(`发送私信给 ${user.username}`);
    // 可以触发私信窗口或跳转到私信页面
  };

  el.innerHTML = `
    <div 
      style="pointer-events:auto; background:rgba(15,23,42,.98);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.2);box-shadow:0 20px 40px rgba(0,0,0,.4),0 0 0 1px rgba(255,255,255,.1);padding:20px;border-radius:16px;min-width:300px;max-width:350px;color:#e5e7eb;"
      onmouseenter="(function(self){ var c=document.getElementById('user-hover-card'); if(!c) return; c.style.pointerEvents='auto'; window.userCardIsHovering=true; if(window.userCardHideTimer){clearTimeout(window.userCardHideTimer);} if(window.userCardInitialTimer){clearTimeout(window.userCardInitialTimer);} window.userCardHideTimer=null; window.userCardInitialTimer=null; })(this)"
      onmouseleave="(function(self){ window.userCardIsHovering=false; var c=document.getElementById('user-hover-card'); if(window.forceHideUserCard){ window.userCardHideTimer=setTimeout(function(){ window.forceHideUserCard(); if(c){ c.style.pointerEvents='none'; } }, 500); } else { if(c){ c.style.pointerEvents='none'; } } })(this)"
    >
      <!-- 头像居中显示 -->
      <div style="display:flex;justify-content:center;margin-bottom:16px;">
        ${avatar}
      </div>
      
      <!-- 用户名 -->
      <div style="text-align:center;font-weight:700;color:#fff;font-size:18px;margin-bottom:12px;">${user.username || '用户'}</div>
      
      <!-- 身份标签（每个身份一个独立胶囊） -->
      <div style="text-align:center;margin-bottom:16px;">
        ${getRoleTags()}
      </div>
      
      <!-- 积分和等级 -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
        <div style="text-align:center;padding:12px;background:rgba(255,255,255,.05);border-radius:8px;border:1px solid rgba(255,255,255,.1);">
          <div style="font-size:16px;font-weight:600;color:#fcd34d;">${user.points || 0}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px;">积分</div>
        </div>
        <div style="text-align:center;padding:12px;background:rgba(255,255,255,.05);border-radius:8px;border:1px solid rgba(255,255,255,.1);">
          <div style="font-size:16px;font-weight:600;color:${levelColor};">${user.level?.name || '菜鸟新人'}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px;">等级</div>
        </div>
      </div>
      
      <!-- 在线状态和加入时间 -->
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,.1);">
        <div style="font-size:12px;color:#94a3b8;display:flex;align-items:center;gap:6px;">
          <div style="width:6px;height:6px;background:#10b981;border-radius:50%;"></div>
          <span>在线</span>
        </div>
        ${user.joinDate ? `<div style="font-size:11px;color:#64748b;">${formatJoinDate(user.joinDate)}加入</div>` : ''}
      </div>
      
      <!-- 私信按钮（当目标为自己时禁用） -->
      <div style="text-align:center;">
        <button
          ${isSelf ? 'disabled' : ''}
          onclick="(function(){
            try {
              var raw = localStorage.getItem('oldksports_user');
              var me = raw ? JSON.parse(raw) : null;
              if (me && me.id && me.id === ${user.id || 'null'}) { return; }
              if (window.openChatWith && ${user.id}) {
                window.openChatWith({ id: ${user.id}, username: '${user.username}', avatar: '${user.avatar || ''}' });
              }
              if (window.forceHideUserCard) window.forceHideUserCard();
            } catch (e) {}
          })()"
          style="background:linear-gradient(135deg,#10b981,#059669);color:white;border:none;padding:8px 16px;border-radius:8px;font-size:14px;font-weight:500;${isSelf ? 'opacity:.45;cursor:not-allowed;' : 'cursor:pointer;'}transition:all 0.2s;box-shadow:0 2px 4px rgba(0,0,0,.2);">
          ${isSelf ? '无法私信自己' : '私信'}
        </button>
      </div>
    </div>`;
}

export async function showUserCard(username: string, anchorRect: DOMRect, forceRefresh = false) {
  console.log('🔥 showUserCard 被调用:', username, anchorRect);
  
  try {
    // 清除所有现有的定时器（改为意图延迟模型）
    clearTimeout(hideTimer);
    clearTimeout(initialDisplayTimer);
    clearTimeout(intentTimer);
    // 重置悬停标记
    isHoveringCard = false;
    (window as any).userCardIsHovering = false;

    const data = await getUser(username, forceRefresh);
    console.log('🔥 获取到用户数据:', data);
    
    renderCard(data);
    const el = ensureContainer();
    console.log('🔥 容器元素:', el);
    
    // 将函数暴露到全局，供HTML中的事件处理使用
    (window as any).forceHideUserCard = forceHideUserCard;
    
    // position: prefer above; fallback below
    const margin = 8;
    const idealTop = Math.max(10, anchorRect.top - el.offsetHeight - margin);
    const belowTop = Math.min(window.innerHeight - 10 - el.offsetHeight, anchorRect.bottom + margin);
    const top = anchorRect.top > el.offsetHeight + 20 ? idealTop : belowTop;
    const left = Math.min(window.innerWidth - el.offsetWidth - 10, Math.max(10, anchorRect.left));
    
    console.log('🔥 设置位置:', { top, left, idealTop, belowTop });
    
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.opacity = '1';
    el.style.transform = 'translateY(0)';
    // 允许卡片接收鼠标事件以保持悬停
    el.style.pointerEvents = 'auto';
    
    console.log('🔥 用户卡片已显示');
    // 设置自动隐藏定时器（2秒后自动隐藏）
    intentTimer = setTimeout(() => {
      console.log('🔥 自动隐藏定时器触发');
      softHideUserCard(0);
    }, 2000);
    // 将定时器暴露到全局，供HTML中的事件处理使用
    (window as any).userCardHideTimer = hideTimer;
    (window as any).userCardInitialTimer = intentTimer;
  } catch (error) {
    console.error('🔥 showUserCard 错误:', error);
  }
}

export function hideUserCard(delay = 0) {
  clearTimeout(hideTimer);
  clearTimeout(initialDisplayTimer);
  clearTimeout(intentTimer);
  const el = ensureContainer();
  const doHide = () => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    // 隐藏后不再接收事件，避免遮挡
    el.style.pointerEvents = 'none';
  };
  const ms = delay > 0 ? delay : HIDE_DELAY_MS;
  if (ms > 0) {
    hideTimer = setTimeout(doHide, ms);
    (window as any).userCardHideTimer = hideTimer;
  } else {
    doHide();
  }
}

// 软隐藏：不清理初始显示定时器，给用户从头像移动到卡片的缓冲时间
export function softHideUserCard(delay = 600) {
  clearTimeout(hideTimer);
  clearTimeout(intentTimer);
  const el = ensureContainer();
  const doHide = () => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(6px)';
    el.style.pointerEvents = 'none';
  };
  const ms = delay > 0 ? delay : HIDE_DELAY_MS;
  if (ms > 0) {
    hideTimer = setTimeout(doHide, ms);
    (window as any).userCardHideTimer = hideTimer; // 同步到全局
  } else {
    doHide();
  }
}

// 强制隐藏用户卡片
export function forceHideUserCard() {
  clearTimeout(hideTimer);
  clearTimeout(initialDisplayTimer);
  const el = ensureContainer();
  el.style.opacity = '0';
  el.style.transform = 'translateY(6px)';
  el.style.pointerEvents = 'none';
}

// 设置全局聊天处理函数
export function setChatHandler(handler: (user: { id: number; username: string; avatar?: string }) => void) {
  console.log('🔥 setChatHandler 被调用:', handler);
  (window as any).openChatWith = (target: { id: number; username: string; avatar?: string }) => {
    console.log('🔥 window.openChatWith 被调用:', target);
    const me = getCurrentUserId();
    console.log('🔥 当前用户ID:', me);
    if (typeof me === 'number' && typeof target?.id === 'number' && me === target.id) {
      console.log('🔥 阻止与自己聊天');
      return;
    }
    handler(target);
  };
}

// ========== 全局自动绑定（兜底） ==========
let autoBindInited = false;
const hoverTimers = new WeakMap<EventTarget, any>();

function findUsernameAnchor(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof HTMLElement)) return null;
  const el = target.closest('[data-username], [data-user]');
  return el as HTMLElement | null;
}

export function initUserHoverAutobind() {
  if (autoBindInited || typeof window === 'undefined' || typeof document === 'undefined') {
    console.log('🔥 initUserHoverAutobind: 跳过初始化（已初始化或环境不支持）');
    return;
  }
  autoBindInited = true;
  console.log('🔥 initUserHoverAutobind: 开始绑定全局事件监听');

  // 改为点击触发
  document.addEventListener('click', (e) => {
    console.log('🔥 全局点击事件触发:', e.target);
    const el = findUsernameAnchor(e.target);
    if (!el) {
      console.log('🔥 未找到包含data-username的元素');
      return;
    }
    const username = el.getAttribute('data-username') || el.getAttribute('data-user');
    console.log('🔥 找到用户头像:', username);
    if (!username) return;
    const rect = el.getBoundingClientRect();
    console.log('🔥 调用showUserCard:', username, rect);
    showUserCard(username, rect);
  }, true);

  // 点击空白区域隐藏
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const inCard = target.closest('#user-hover-card');
    const inAnchor = target.closest('[data-username], [data-user]');
    if (!inCard && !inAnchor) {
      console.log('🔥 点击空白区域，隐藏卡片');
      softHideUserCard(HIDE_DELAY_MS);
    }
  }, true);
  
  console.log('🔥 全局事件监听绑定完成');
}


