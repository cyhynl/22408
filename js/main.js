// =============================================================
//  22408 考研全科例题集 - 主文件
// =============================================================

// =============================================================
//  项目配置
// =============================================================
const PROJECTS = [
    { id: 'proj-math-err', name: '高等数学例题集',  storageKey: 'math_error_collection',  color: '#b8322c', icon: '📕', type: 'error' },
    { id: 'proj-math-ce',  name: '高等数学经典例子', storageKey: 'math_counterexamples', color: '#2b6cb0', icon: '📘', type: 'error' },
    { id: 'proj-linear',   name: '线性代数例题集',   storageKey: 'linear_error_collection', color: '#d69e2e', icon: '📗', type: 'error' },
    { id: 'proj-os',       name: '操作系统例题集',   storageKey: 'os_error_collection',   color: '#805ad5', icon: '🟣', type: 'error' },
    { id: 'proj-ds',       name: '数据结构例题集',   storageKey: 'ds_error_collection',   color: '#dd6b20', icon: '🟠', type: 'error' },
    { id: 'proj-cn',       name: '计算机网络例题集',  storageKey: 'cn_error_collection',   color: '#00a3c4', icon: '🟦', type: 'error' },
    { id: 'proj-co',       name: '计算机组成原理例题集', storageKey: 'co_error_collection', color: '#c53030', icon: '🔴', type: 'error' },
    { id: 'proj-en',       name: '英语背诵助手',     storageKey: 'english_memorize_items', color: '#38a169', icon: '📗', type: 'english' }
];

// 字段标签映射
const FIELD_LABELS = {
    error:   { proposition: '题目/考点', counter: '易错点', analysis: '详细分析', callout: '避坑指南' },
    english: { proposition: '内容',      counter: '释义',   analysis: '备注',      callout: '' }
};

// =============================================================
//  数据加载与持久化
// =============================================================
const ORDER_KEY = '22408_project_order';
const GROUP_ORDER_PREFIX = '22408_go_';

function loadProjectOrder() {
    try {
        const saved = localStorage.getItem(ORDER_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
}

function saveProjectOrder(order) {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
}

function loadGroupOrder(projId) {
    try {
        const saved = localStorage.getItem(GROUP_ORDER_PREFIX + projId);
        return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
}

function saveGroupOrder(projId, order) {
    localStorage.setItem(GROUP_ORDER_PREFIX + projId, JSON.stringify(order));
}

// =============================================================
//  从各项目 localStorage 读取原始数据
// =============================================================
function loadRawData(storageKey) {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
}

function saveRawData(storageKey, data) {
    try {
        localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
        console.error('localStorage 保存失败:', storageKey, e);
        showToast('❌ 存储空间不足！请清理一些图片或导出数据后重试', 'error');
        throw e;
    }
}

// =============================================================
//  构建统一数据树
// =============================================================
let unifiedTree = []; // [{ projConfig, groups: [{ name, items: [...] }] }]

function buildUnifiedTree() {
    unifiedTree = [];

    // 确定项目顺序
    let projOrder = loadProjectOrder();
    const projIds = PROJECTS.map(p => p.id);
    if (!projOrder || projOrder.length === 0) {
        projOrder = projIds;
        saveProjectOrder(projOrder);
    } else {
        projIds.forEach(id => { if (!projOrder.includes(id)) projOrder.push(id); });
        projOrder = projOrder.filter(id => projIds.includes(id));
        saveProjectOrder(projOrder);
    }

    for (const projId of projOrder) {
        const config = PROJECTS.find(p => p.id === projId);
        if (!config) continue;

        const rawData = loadRawData(config.storageKey);
        const groups = {};

        if (config.type === 'english') {
            // 英语背诵按 type 字段分组（单词/词组/长难句）
            rawData.forEach(item => {
                const g = item.type || '未分类';
                if (!groups[g]) groups[g] = [];
                groups[g].push(item);
            });
        } else {
            rawData.forEach(item => {
                const g = item.group || '未分类';
                if (!groups[g]) groups[g] = [];
                groups[g].push(item);
            });
        }

        // 确定分组顺序
        let groupOrder = loadGroupOrder(projId);
        const groupNames = Object.keys(groups);
        if (!groupOrder || groupOrder.length === 0) {
            groupOrder = groupNames;
            saveGroupOrder(projId, groupOrder);
        } else {
            groupNames.forEach(n => { if (!groupOrder.includes(n)) groupOrder.push(n); });
            groupOrder = groupOrder.filter(n => groupNames.includes(n));
            saveGroupOrder(projId, groupOrder);
        }

        const groupList = [];
        for (const gName of groupOrder) {
            const items = groups[gName];
            if (!items) continue;
            // 英语项目按遗忘次数降序排列（便于复习），其他科目保留手动拖拽顺序
            if (config.type === 'english') {
                items.sort((a, b) => (b.forgotCount || 0) - (a.forgotCount || 0));
            }
            groupList.push({ name: gName, items });
        }

        unifiedTree.push({ config, groups: groupList });
    }
}

// =============================================================
//  获取项目原始数据数组
// =============================================================
function getRawArray(config) {
    return loadRawData(config.storageKey);
}

function setRawArray(config, data) {
    saveRawData(config.storageKey, data);
}

// =============================================================
//  保存状态（同时写回原始 localStorage）
// =============================================================
function flushAll() {
    for (const entry of unifiedTree) {
        const config = entry.config;
        const allItems = [];
        for (const g of entry.groups) {
            for (const item of g.items) {
                allItems.push(item);
            }
        }
        setRawArray(config, allItems);
    }
}

// =============================================================
//  搜索
// =============================================================
let searchFilter = '';

function onSearchInput(value) {
    searchFilter = value.trim().toLowerCase();
    document.getElementById('searchClear').style.display = searchFilter ? 'block' : 'none';
    if (searchFilter) {
        // 搜索时自动展开所有项目
        for (const p of PROJECTS) expandedProjects.add(p.id);
    } else {
        // 搜索为空时恢复默认折叠
        expandedProjects.clear();
    }
    renderNav();
    if (currentView) showItem(currentView.projId, currentView.itemId);
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    onSearchInput('');
}

function matchesSearch(text) {
    if (!searchFilter) return true;
    return text.toLowerCase().includes(searchFilter);
}

// =============================================================
//  渲染三级导航栏
// =============================================================
function renderNav() {
    const nav = document.getElementById('sidebarNav');
    let html = '';

    for (const entry of unifiedTree) {
        const { config, groups } = entry;
        const projId = config.id;
        const isProjExpanded = expandedProjects.has(projId);

        // 搜索时过滤：检查项目名、分组名、标题是否匹配
        let hasMatch = false;
        const filteredGroups = [];
        if (searchFilter) {
            for (const g of groups) {
                const matchedItems = g.items.filter(item => {
                    const title = config.type === 'english' ? item.content : item.title;
                    return matchesSearch(title) || matchesSearch(g.name) || matchesSearch(config.name) ||
                           (item.tags && item.tags.some(t => matchesSearch(t)));
                });
                if (matchedItems.length > 0 || matchesSearch(g.name) || matchesSearch(config.name)) {
                    hasMatch = true;
                    filteredGroups.push({ ...g, items: matchedItems.length > 0 ? matchedItems : g.items });
                }
            }
        }

        const displayGroups = searchFilter ? filteredGroups : groups;
        const displayCount = searchFilter
            ? displayGroups.reduce((sum, g) => sum + g.items.length, 0)
            : countItems(groups);

        // 搜索时如有匹配自动展开项目
        const showProject = searchFilter ? (hasMatch || matchesSearch(config.name)) : isProjExpanded;

        html += `<div class="nav-project" data-project-id="${projId}">`;
        html += `<div class="nav-project-header drop-target" data-project-id="${projId}" style="background:${config.color}" onclick="toggleProject('${projId}')">`;
        html += `<span class="arrow ${showProject ? 'expanded' : ''}" id="proj-arrow-${projId}">&#9654;</span>`;
        html += `<span class="project-name">${config.icon} ${config.name}</span>`;
        html += `<span class="project-count">${displayCount}</span>`;
        html += `</div>`;

        if (showProject) {
            for (const g of displayGroups) {
                const gId = 'grp-' + projId + '-' + g.name.replace(/[^\w\u4e00-\u9fff]/g, '_');
                const isGrpExpanded = searchFilter ? true : expandedGroups.has(gId);

                html += `<div class="nav-group">`;
                html += `<div class="nav-group-header drop-target" data-project-id="${projId}" data-group="${g.name}" onclick="toggleGroup('${gId}')">`;
                html += `<span class="arrow ${isGrpExpanded ? 'expanded' : ''}" id="${gId}-arrow">&#9654;</span>`;
                html += `<span class="group-name">${g.name}</span>`;
                html += `<span class="group-count">${g.items.length}</span>`;
                html += `</div>`;

                html += `<div class="nav-items ${isGrpExpanded ? '' : 'collapsed'}" id="${gId}-items">`;
                for (const item of g.items) {
                    const label = config.type === 'english' ? item.content : item.title;
                    const forgotBadge = (item.forgotCount || 0) > 0
                        ? `<span class="item-forgot-badge">${item.forgotCount || 0}❌</span>`
                        : '';
                    html += `<a class="nav-item drop-target" data-project-id="${projId}" data-group="${g.name}" data-item-id="${item.id}" onclick="showItem('${projId}','${item.id}')">`;
                    html += `<span class="item-title">${escapeHtml(label)}</span>`;
                    html += forgotBadge;
                    html += `</a>`;
                }
                html += `</div></div>`;
            }
        }

        html += `</div>`;
    }

    nav.innerHTML = html;

    // 更新总数
    let total = 0;
    for (const entry of unifiedTree) {
        total += countItems(entry.groups);
    }
    document.getElementById('totalCount').textContent = total;

    setupDragDrop();
}

function countItems(groups) {
    let c = 0;
    for (const g of groups) c += g.items.length;
    return c;
}

// =============================================================
//  折叠/展开
// =============================================================
const EXPANDED_PROJ_KEY = '22408_expanded_proj';
const EXPANDED_GRP_KEY = '22408_expanded_grp';

let expandedProjects = loadExpandedProjects();
let expandedGroups = loadExpandedGroups2();

function loadExpandedProjects() {
    try {
        const s = localStorage.getItem(EXPANDED_PROJ_KEY);
        return s ? new Set(JSON.parse(s)) : new Set();
    } catch (e) { return new Set(); }
}

function saveExpandedProjects(set) {
    localStorage.setItem(EXPANDED_PROJ_KEY, JSON.stringify([...set]));
}

function loadExpandedGroups2() {
    try {
        const s = localStorage.getItem(EXPANDED_GRP_KEY);
        return s ? new Set(JSON.parse(s)) : new Set();
    } catch (e) { return new Set(); }
}

function saveExpandedGroups2(set) {
    localStorage.setItem(EXPANDED_GRP_KEY, JSON.stringify([...set]));
}

function toggleProject(projId) {
    if (expandedProjects.has(projId)) {
        expandedProjects.delete(projId);
    } else {
        expandedProjects.add(projId);
        // 每次展开时，清除该项目的所有分组展开状态，确保二三级默认折叠
        const toRemove = [];
        for (const gId of expandedGroups) {
            if (gId.startsWith('grp-' + projId)) toRemove.push(gId);
        }
        toRemove.forEach(id => expandedGroups.delete(id));
    }
    saveExpandedProjects(expandedProjects);
    saveExpandedGroups2(expandedGroups);
    renderNav();
    if (currentView) showItem(currentView.projId, currentView.itemId);
}

function toggleGroup(gId) {
    if (expandedGroups.has(gId)) {
        expandedGroups.delete(gId);
    } else {
        expandedGroups.add(gId);
    }
    saveExpandedGroups2(expandedGroups);
    // 重新渲染导航，但不重建全部内容
    const nav = document.getElementById('sidebarNav');
    // 简单处理：重新渲染全部
    renderNav();
    if (currentView) showItem(currentView.projId, currentView.itemId);
}

// =============================================================
//  学习统计看板
// =============================================================
function showStats() {
    const body = document.getElementById('statsBody');
    const totalItems = unifiedTree.reduce((sum, e) => sum + countItems(e.groups), 0);

    if (totalItems === 0) {
        body.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-muted);font-size:11pt;">暂无数据，先添加一些内容吧 📝</div>';
        document.getElementById('statsOverlay').classList.add('active');
        return;
    }

    // 汇总数据
    let totalForgot = 0;
    let totalRemembered = 0;
    const today = new Date();
    let reviewedToday = 0;
    const projData = [];
    const allItems = [];

    for (const entry of unifiedTree) {
        let projCount = 0;
        let projForgot = 0;
        for (const g of entry.groups) {
            for (const item of g.items) {
                projCount++;
                totalForgot += item.forgotCount || 0;
                totalRemembered += item.rememberedCount || 0;
                if (item.lastReviewDate) {
                    const rd = new Date(item.lastReviewDate);
                    if (rd.toDateString() === today.toDateString()) reviewedToday++;
                }
                allItems.push({ item, config: entry.config, group: g.name });
            }
        }
        projData.push({ config: entry.config, count: projCount });
    }

    // 按遗忘次数排序
    allItems.sort((a, b) => (b.item.forgotCount || 0) - (a.item.forgotCount || 0));
    const topForgot = allItems.slice(0, 10);

    // 最大值用于进度条比例
    const maxCount = Math.max(...projData.map(d => d.count), 1);

    let html = '';

    // 概览卡片
    html += `<div class="stats-summary">
        <div class="stat-card"><span class="stat-number">${totalItems}</span><span class="stat-label">📚 总条目</span></div>
        <div class="stat-card"><span class="stat-number">${totalForgot}</span><span class="stat-label">❌ 遗忘次数</span></div>
        <div class="stat-card"><span class="stat-number">${totalRemembered}</span><span class="stat-label">✅ 记住次数</span></div>
        <div class="stat-card"><span class="stat-number">${reviewedToday}</span><span class="stat-label">📅 今日复习</span></div>
    </div>`;

    // 各项目分布
    html += `<div class="stats-section"><h3>📂 各项目分布</h3>`;
    for (const d of projData) {
        const pct = maxCount > 0 ? Math.round(d.count / maxCount * 100) : 0;
        html += `<div class="stats-bar-row">
            <span class="stats-bar-label">${d.config.icon} ${d.config.name}</span>
            <div class="stats-bar-track"><div class="stats-bar-fill" style="width:${pct}%;background:${d.config.color};"></div></div>
            <span class="stats-bar-count">${d.count}</span>
        </div>`;
    }
    html += `</div>`;

    // 遗忘排行榜
    html += `<div class="stats-section"><h3>🏆 遗忘排行榜 TOP 10</h3>`;
    if (topForgot.length === 0 || (topForgot[0].item.forgotCount || 0) === 0) {
        html += `<div style="color:var(--text-muted);font-size:9.5pt;padding:8px 0;">暂无遗忘记录，继续保持！🎉</div>`;
    } else {
        html += `<ul class="stats-rank-list">`;
        topForgot.forEach((entry, idx) => {
            if ((entry.item.forgotCount || 0) === 0) return;
            const title = entry.config.type === 'english' ? entry.item.content : entry.item.title;
            html += `<li class="stats-rank-item">
                <span class="rank-num">${idx + 1}</span>
                <span class="rank-title">${escapeHtml(title)}</span>
                <span style="font-size:8pt;color:var(--text-muted);">${entry.config.icon}</span>
                <span class="rank-count">❌ ${entry.item.forgotCount || 0} 次</span>
            </li>`;
        });
        html += `</ul>`;
    }
    html += `</div>`;

    body.innerHTML = html;
    document.getElementById('statsOverlay').classList.add('active');
}

function closeStats() {
    document.getElementById('statsOverlay').classList.remove('active');
}

// =============================================================
//  显示内容项
// =============================================================
let currentView = null;

function showItem(projId, itemId) {
    document.querySelectorAll('.content-item').forEach(el => el.classList.remove('active'));
    document.getElementById('welcomePage').classList.remove('visible');

    // 查找数据
    const entry = unifiedTree.find(e => e.config.id === projId);
    if (!entry) return;
    let foundItem = null, foundGroup = null;
    for (const g of entry.groups) {
        const item = g.items.find(i => i.id === itemId);
        if (item) { foundItem = item; foundGroup = g; break; }
    }
    if (!foundItem) return;

    currentView = { projId, itemId };

    // 查找或创建 DOM 元素
    let el = document.getElementById('item-' + projId + '-' + itemId);
    if (!el) {
        el = document.createElement('section');
        el.className = 'content-item';
        el.id = 'item-' + projId + '-' + itemId;
        document.getElementById('mainContent').insertBefore(el, document.getElementById('modalOverlay'));
    }
    el.innerHTML = renderItemContent(entry.config, foundGroup.name, foundItem);
    el.classList.add('active');

    // 激活导航项
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navEl = document.querySelector(`.nav-item[data-project-id="${projId}"][data-item-id="${itemId}"]`);
    if (navEl) navEl.classList.add('active');

    renderKaTeX(el);
}

function renderItemContent(config, groupName, item) {
    const isEnglish = config.type === 'english';
    const tagsHtml = (item.tags || []).map(t => `<span class="item-tag">${t}</span>`).join('');
    const imageHtml = item.image ? `<div class="item-image"><img src="${item.image}" alt="题目图片"></div>` : '';
    const analysisImageHtml = item.analysisImage ? `<div class="item-image" style="margin-top:8px;"><img src="${item.analysisImage}" alt="解析图片"></div>` : '';

    if (isEnglish) {
        const meaningHtml = item.meaning
            ? `<div class="item-meaning-box"><span class="label">📖 释义：</span>${renderContent(item.meaning)}</div>` : '';
        const noteHtml = item.note
            ? `<div class="item-note-box"><span class="label">💡 备注：</span>${renderContent(item.note)}</div>` : '';

        return `
            <div class="item-project-bar">
                <span class="item-project-badge" style="background:${config.color}">${config.icon} ${config.name}</span>
                <span class="item-group-badge">${groupName}</span>
            </div>
            <div class="item-header">
                <div class="item-number">#${item.id.replace('item-', '')}</div>
                <h1 class="item-title">${renderContent(item.content)}</h1>
                <div class="item-stats">
                    <span class="stat-forgot">❌ 没记住 ${item.forgotCount || 0} 次</span>
                    <span class="stat-remembered">✅ 记住了 ${item.rememberedCount || 0} 次</span>
                </div>
                <div class="item-actions">
                    <button onclick="editItem('${config.id}','${item.id}')">✏️ 编辑</button>
                    <button class="btn-del" onclick="deleteItem('${config.id}','${item.id}')">🗑️ 删除</button>
                </div>
            </div>
            <div class="item-body">
                ${imageHtml}
                ${meaningHtml}
                ${noteHtml}
                ${analysisImageHtml}
            </div>
            <div class="item-footer">
                <span>📅 添加于 ${item.date || '未知'}</span>
            </div>`;
    } else {
        const calloutHtml = item.callout
            ? `<div class="callout-box"><div class="callout-title">💡 ${FIELD_LABELS.error.callout}</div>${renderContent(item.callout)}</div>` : '';

        return `
            <div class="item-project-bar">
                <span class="item-project-badge" style="background:${config.color}">${config.icon} ${config.name}</span>
                <span class="item-group-badge">${groupName}</span>
            </div>
            <div class="item-header">
                <div class="item-number">#${item.id.replace('ce-', '')}</div>
                <h1 class="item-title">${renderContent(item.title)}</h1>
                <div class="item-tags">${tagsHtml}</div>
                <div class="item-actions">
                    <button onclick="editItem('${config.id}','${item.id}')">✏️ 编辑</button>
                    <button class="btn-del" onclick="deleteItem('${config.id}','${item.id}')">🗑️ 删除</button>
                </div>
            </div>
            <div class="item-body">
                ${imageHtml}
                <div class="item-prop"><span class="label">● ${FIELD_LABELS.error.proposition}：</span>${renderContent(item.proposition || '')}</div>
                <div class="item-counter"><span class="label" style="color:var(--danger)">● ${FIELD_LABELS.error.counter}：</span>${renderContent(item.counterexample || '')}</div>
                <div class="item-analysis">${renderContent(item.analysis || '')}</div>
                ${analysisImageHtml}
                ${calloutHtml}
            </div>
            <div class="item-footer">
                <span>📅 添加于 ${item.date || new Date().toISOString().slice(0, 10)}</span>
            </div>`;
    }
}

// =============================================================
//  拖拽功能（三级均可拖拽）
// =============================================================
function setupDragDrop() {
    // 清除旧监听器（简单处理：重新绑定）
    // 三级：item 拖拽
    document.querySelectorAll('.nav-item').forEach(el => {
        el.draggable = true;
        el.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'item',
                projId: this.dataset.projectId,
                group: this.dataset.group,
                itemId: this.dataset.itemId
            }));
            this.classList.add('dragging');
        });
        el.addEventListener('dragend', function(e) { this.classList.remove('dragging'); });
    });

    // 二级：group 拖拽
    document.querySelectorAll('.nav-group-header').forEach(el => {
        el.draggable = true;
        el.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'group',
                projId: this.dataset.projectId,
                group: this.dataset.group
            }));
            this.classList.add('dragging');
        });
        el.addEventListener('dragend', function(e) { this.classList.remove('dragging'); });
    });

    // 一级：project 拖拽
    document.querySelectorAll('.nav-project-header').forEach(el => {
        el.draggable = true;
        el.addEventListener('dragstart', function(e) {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                type: 'project',
                projId: this.dataset.projectId
            }));
            this.classList.add('dragging');
        });
        el.addEventListener('dragend', function(e) { this.classList.remove('dragging'); });
    });

    // ---- 放置处理 ----
    // 所有 drop-target 都可接收放置
    document.querySelectorAll('.drop-target').forEach(el => {
        el.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        });
        el.addEventListener('dragleave', function(e) {
            this.classList.remove('drag-over');
        });
        el.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');

            let dragData;
            try {
                dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
            } catch (err) { return; }
            if (!dragData || !dragData.type) return;

            if (dragData.type === 'item') {
                handleItemDrop(dragData, el);
            } else if (dragData.type === 'group') {
                handleGroupDrop(dragData, el);
            } else if (dragData.type === 'project') {
                handleProjectDrop(dragData, el);
            }
        });
    });
}

// ---- Item 放置 ----
function handleItemDrop(dragData, targetEl) {
    // 目标可以是: group-header (移动到此分组) 或 project-header (移到项目的第一个分组)
    const targetType = targetEl.classList.contains('nav-group-header') ? 'group' :
                       targetEl.classList.contains('nav-project-header') ? 'project' :
                       targetEl.classList.contains('nav-item') ? 'item' : null;
    if (!targetType) return;

    const entry = unifiedTree.find(e => e.config.id === dragData.projId);
    if (!entry) return;
    let sourceItem = null, sourceGroup = null;
    for (const g of entry.groups) {
        const item = g.items.find(i => i.id === dragData.itemId);
        if (item) { sourceItem = item; sourceGroup = g; break; }
    }
    if (!sourceItem) return;

    if (targetType === 'group') {
        const targetProjId = targetEl.dataset.projectId;
        const targetGroupName = targetEl.dataset.group;
        const targetEntry = unifiedTree.find(e => e.config.id === targetProjId);
        if (!targetEntry) return;
        let targetGroup = targetEntry.groups.find(g => g.name === targetGroupName);
        if (!targetGroup) return;

        // 从源分组移除
        sourceGroup.items = sourceGroup.items.filter(i => i.id !== dragData.itemId);
        // 如果跨项目，更新项目配置（英语项目的 content 字段映射）
        if (dragData.projId !== targetProjId) {
            // 跨项目移动时，保留数据不变
        }
        targetGroup.items.push(sourceItem);
        flushAll();
        rebuildAll();
        showItem(targetProjId, dragData.itemId);
        showToast(`✅ 已移动到「${targetGroupName}」`);
    } else if (targetType === 'item') {
        // 拖拽到具体项上：同组内排序 / 跨组移动
        const targetProjId = targetEl.dataset.projectId;
        const targetGroupName = targetEl.dataset.group;
        const targetItemId = targetEl.dataset.itemId;
        const targetEntry = unifiedTree.find(e => e.config.id === targetProjId);
        if (!targetEntry) return;
        let targetGroup = targetEntry.groups.find(g => g.name === targetGroupName);
        if (!targetGroup) return;

        if (dragData.projId === targetProjId && sourceGroup === targetGroup) {
            // 同组内排序：将 sourceItem 移到 targetItem 的位置
            const fromIdx = sourceGroup.items.indexOf(sourceItem);
            const toIdx = targetGroup.items.findIndex(i => i.id === targetItemId);
            if (fromIdx === -1 || toIdx === -1) return;
            sourceGroup.items.splice(fromIdx, 1);
            const insertIdx = toIdx > fromIdx ? toIdx - 1 : toIdx;
            targetGroup.items.splice(insertIdx, 0, sourceItem);
        } else {
            // 跨组移动：插入到 targetItem 的位置
            sourceGroup.items = sourceGroup.items.filter(i => i.id !== dragData.itemId);
            const toIdx = targetGroup.items.findIndex(i => i.id === targetItemId);
            if (toIdx === -1) {
                targetGroup.items.push(sourceItem);
            } else {
                targetGroup.items.splice(toIdx, 0, sourceItem);
            }
        }
        flushAll();
        rebuildAll();
        showItem(targetProjId, dragData.itemId);
        showToast(`✅ 已调整位置`);
    } else if (targetType === 'project') {
        const targetProjId = targetEl.dataset.projectId;
        const targetEntry = unifiedTree.find(e => e.config.id === targetProjId);
        if (!targetEntry || targetEntry.groups.length === 0) return;
        const targetGroup = targetEntry.groups[0];

        sourceGroup.items = sourceGroup.items.filter(i => i.id !== dragData.itemId);
        targetGroup.items.push(sourceItem);
        flushAll();
        rebuildAll();
        showItem(targetProjId, dragData.itemId);
        showToast(`✅ 已移动到「${targetEntry.config.name}」`);
    }
}

// ---- Group 放置 ----
function handleGroupDrop(dragData, targetEl) {
    const targetType = targetEl.classList.contains('nav-group-header') ? 'group' : null;
    if (!targetType) return;

    const srcProjId = dragData.projId;
    const srcGroupName = dragData.group;
    const tgtProjId = targetEl.dataset.projectId;
    const tgtGroupName = targetEl.dataset.group;

    if (srcProjId !== tgtProjId) return; // 仅允许同项目内排序
    if (srcGroupName === tgtGroupName) return;

    const entry = unifiedTree.find(e => e.config.id === srcProjId);
    if (!entry) return;

    const fromIdx = entry.groups.findIndex(g => g.name === srcGroupName);
    const toIdx = entry.groups.findIndex(g => g.name === tgtGroupName);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = entry.groups.splice(fromIdx, 1);
    entry.groups.splice(toIdx, 0, moved);

    // 保存分组顺序
    const order = entry.groups.map(g => g.name);
    saveGroupOrder(srcProjId, order);

    rebuildAll();
    showToast(`✅ 已调整分组顺序`);
}

// ---- Project 放置 ----
function handleProjectDrop(dragData, targetEl) {
    const targetType = targetEl.classList.contains('nav-project-header') ? 'project' : null;
    if (!targetType) return;

    const srcId = dragData.projId;
    const tgtId = targetEl.dataset.projectId;
    if (srcId === tgtId) return;

    const fromIdx = unifiedTree.findIndex(e => e.config.id === srcId);
    const toIdx = unifiedTree.findIndex(e => e.config.id === tgtId);
    if (fromIdx === -1 || toIdx === -1) return;

    const [moved] = unifiedTree.splice(fromIdx, 1);
    unifiedTree.splice(toIdx, 0, moved);

    const order = unifiedTree.map(e => e.config.id);
    saveProjectOrder(order);

    rebuildAll();
    showToast(`✅ 已调整项目顺序`);
}

// =============================================================
//  重建所有
// =============================================================
function rebuildAll() {
    buildUnifiedTree();
    renderNav();
    // 重建内容 DOM
    document.querySelectorAll('.content-item').forEach(el => el.remove());
    if (currentView) {
        showItem(currentView.projId, currentView.itemId);
    } else {
        document.getElementById('welcomePage').classList.add('visible');
    }

}

// =============================================================
//  模态框
// =============================================================
function openAddModal() {
    document.getElementById('modalTitle').textContent = '📝 新增';
    document.getElementById('submitBtn').textContent = '✅ 添加';
    document.getElementById('itemForm').reset();
    document.getElementById('editId').value = '';
    document.getElementById('editProject').value = '';

    // 填充项目下拉
    const projSelect = document.getElementById('itemProject');
    projSelect.innerHTML = PROJECTS.map(p =>
        `<option value="${p.id}">${p.icon} ${p.name}</option>`
    ).join('');
    projSelect.value = '';

    // 默认隐藏英语专用字段
    document.getElementById('fieldProposition').style.display = 'block';
    document.getElementById('fieldCounter').style.display = 'none';

    document.getElementById('modalOverlay').classList.add('active');
    // 默认高亮题目图片上传区域
    setActiveImageTarget('question');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

function onProjectChange() {
    const projId = document.getElementById('itemProject').value;
    const config = PROJECTS.find(p => p.id === projId);
    if (!config) return;

    const isEnglish = config.type === 'english';

    // 英语专属字段（释义/翻译）仅英语时显示
    document.getElementById('fieldCounter').style.display = isEnglish ? 'block' : 'none';

    // 更新字段标签
    document.getElementById('labelProposition').textContent = isEnglish ? '内容' : FIELD_LABELS.error.proposition;
    document.getElementById('labelCounter').textContent = isEnglish ? '释义 / 翻译' : FIELD_LABELS.error.counter;
    document.getElementById('labelAnalysis').textContent = isEnglish ? '备注' : FIELD_LABELS.error.analysis;
    document.getElementById('labelCallout').textContent = isEnglish ? '记忆技巧' : FIELD_LABELS.error.callout;

    // 场景调整placeholder
    document.getElementById('itemProposition').placeholder = isEnglish ? '输入单词、词组或句子' : '支持 Markdown 和 KaTeX 公式 $...$ 或 $$...$$';
    document.getElementById('itemCounter').placeholder = isEnglish ? '输入释义或翻译' : '记录易错点或例子……';
    document.getElementById('itemAnalysis').placeholder = isEnglish ? '记忆技巧、例句等' : '支持 Markdown 和 KaTeX 公式 $...$ 或 $$...$$';
    document.getElementById('itemCallout').placeholder = isEnglish ? '额外注解' : '总结、避坑指南等……';

    populateGroupListForProject(projId);
}

function populateGroupListForProject(projId) {
    const datalist = document.getElementById('groupList');
    const entry = unifiedTree.find(e => e.config.id === projId);
    const groups = new Set();
    if (entry) {
        for (const g of entry.groups) {
            groups.add(g.name);
        }
    }
    datalist.innerHTML = Array.from(groups).sort().map(g => `<option value="${g}">`).join('');
}

// =============================================================
//  编辑
// =============================================================
function editItem(projId, itemId) {
    const entry = unifiedTree.find(e => e.config.id === projId);
    if (!entry) return;
    const config = entry.config;
    let item = null, groupName = '';
    for (const g of entry.groups) {
        const found = g.items.find(i => i.id === itemId);
        if (found) { item = found; groupName = g.name; break; }
    }
    if (!item) return;

    const isEnglish = config.type === 'english';

    document.getElementById('modalTitle').textContent = '✏️ 编辑';
    document.getElementById('submitBtn').textContent = '💾 保存';
    document.getElementById('editId').value = itemId;
    document.getElementById('editProject').value = projId;

    // 填充项目下拉（不禁用，允许跨项目移动）
    const projSelect = document.getElementById('itemProject');
    projSelect.innerHTML = PROJECTS.map(p =>
        `<option value="${p.id}" ${p.id === projId ? 'selected' : ''}>${p.icon} ${p.name}</option>`
    ).join('');
    projSelect.disabled = false;

    document.getElementById('itemGroup').value = groupName;
    document.getElementById('itemTitle').value = isEnglish ? (item.content || '') : (item.title || '');
    document.getElementById('itemTags').value = (item.tags || []).join(', ');

    // 根据类型填充
    onProjectChange(); // 更新标签

    if (isEnglish) {
        document.getElementById('itemProposition').value = item.content || '';
        document.getElementById('itemCounter').value = item.meaning || '';
        document.getElementById('itemAnalysis').value = item.note || '';
        document.getElementById('itemCallout').value = '';
    } else {
        document.getElementById('itemProposition').value = item.proposition || '';
        document.getElementById('itemCounter').value = item.counterexample || '';
        document.getElementById('itemAnalysis').value = item.analysis || '';
        document.getElementById('itemCallout').value = item.callout || '';
    }

    // 图片
    const previewDivQ = document.getElementById('imagePreviewQ');
    const previewImgQ = document.getElementById('previewImgQ');
    if (item.image) { previewImgQ.src = item.image; previewDivQ.style.display = 'block';
        document.getElementById('imageStatusQ').textContent = '已选择图片';
        document.getElementById('imageStatusQ').classList.add('has-image'); }
    else { previewDivQ.style.display = 'none'; previewImgQ.src = '';
        document.getElementById('imageStatusQ').textContent = '📋 点击选择或 Ctrl+V 粘贴';
        document.getElementById('imageStatusQ').classList.remove('has-image'); }
    document.getElementById('itemImage').value = '';

    const previewDivA = document.getElementById('imagePreviewA');
    const previewImgA = document.getElementById('previewImgA');
    if (item.analysisImage) { previewImgA.src = item.analysisImage; previewDivA.style.display = 'block';
        document.getElementById('imageStatusA').textContent = '已选择图片';
        document.getElementById('imageStatusA').classList.add('has-image'); }
    else { previewDivA.style.display = 'none'; previewImgA.src = '';
        document.getElementById('imageStatusA').textContent = '📋 点击选择或 Ctrl+V 粘贴';
        document.getElementById('imageStatusA').classList.remove('has-image'); }
    document.getElementById('itemAnalysisImage').value = '';

    document.getElementById('modalOverlay').classList.add('active');
    // 默认高亮题目图片上传区域
    setActiveImageTarget('question');
}

// =============================================================
//  保存
// =============================================================
function saveItem(e) {
    e.preventDefault();

    const editId = document.getElementById('editId').value;
    const editProj = document.getElementById('editProject').value;
    const projId = document.getElementById('itemProject').value;
    const config = PROJECTS.find(p => p.id === projId);
    if (!config) { showToast('请选择项目', 'error'); return; }

    const group = document.getElementById('itemGroup').value.trim() || '未分类';
    const title = document.getElementById('itemTitle').value.trim();
    const tagsRaw = document.getElementById('itemTags').value.trim();
    const tags = tagsRaw ? tagsRaw.split(/[，,]/).map(s => s.trim()).filter(Boolean) : [];
    const proposition = document.getElementById('itemProposition').value.trim();
    const counter = document.getElementById('itemCounter').value.trim();
    const analysis = document.getElementById('itemAnalysis').value.trim();
    const callout = document.getElementById('itemCallout').value.trim();
    const image = document.getElementById('imagePreviewQ').style.display === 'block'
        ? document.getElementById('previewImgQ').src : '';
    const analysisImage = document.getElementById('imagePreviewA').style.display === 'block'
        ? document.getElementById('previewImgA').src : '';

    if (!title) { showToast('请输入标题！', 'error'); return; }

    const isEnglish = config.type === 'english';

    if (editId) {
        // 编辑：从原项目查找 item（可能跨项目移动）
        let item = null;
        let oldEntry = unifiedTree.find(e => e.config.id === editProj);
        if (oldEntry) {
            for (const g of oldEntry.groups) {
                const found = g.items.find(i => i.id === editId);
                if (found) { item = found; break; }
            }
        }
        if (!item) return;

        // 更新字段
        if (isEnglish) {
            item.content = title;
            item.meaning = counter;
            item.note = analysis;
        } else {
            item.title = title;
            item.proposition = proposition;
            item.counterexample = counter;
            item.analysis = analysis;
            item.callout = callout;
        }
        item.tags = tags;
        item.image = image;
        item.analysisImage = analysisImage;

        // 处理分组/项目变化
        if (editProj && editProj !== projId) {
            // ===== 跨项目移动 =====
            // 从原项目移除
            if (oldEntry) {
                for (const g of oldEntry.groups) {
                    g.items = g.items.filter(i => i.id !== editId);
                }
                oldEntry.groups = oldEntry.groups.filter(g => g.items.length > 0);
                saveGroupOrder(editProj, oldEntry.groups.map(g => g.name));
            }
            // 更新 item 的分组字段
            if (isEnglish) {
                item.type = group;
            } else {
                item.group = group;
            }
            // 加入新项目
            const newEntry = unifiedTree.find(e => e.config.id === projId);
            if (!newEntry) return;
            let targetGroup = newEntry.groups.find(g => g.name === group);
            if (!targetGroup) {
                targetGroup = { name: group, items: [] };
                newEntry.groups.push(targetGroup);
                saveGroupOrder(projId, newEntry.groups.map(g => g.name));
            }
            targetGroup.items.push(item);
            showToast('✅ 已跨项目移动！');
        } else if (editProj && editProj === projId) {
            // ===== 同项目内移动分组 =====
            if (isEnglish) {
                item.type = group;
            } else {
                item.group = group;
            }
            const entry = unifiedTree.find(e => e.config.id === projId);
            if (!entry) return;
            for (const g of entry.groups) {
                g.items = g.items.filter(i => i.id !== editId);
            }
            let targetGroup = entry.groups.find(g => g.name === group);
            if (!targetGroup) {
                targetGroup = { name: group, items: [] };
                entry.groups.push(targetGroup);
                saveGroupOrder(projId, entry.groups.map(g => g.name));
            }
            targetGroup.items.push(item);
            showToast('✅ 已更新！');
        }
    } else {
        // 新增
        const entry = unifiedTree.find(e => e.config.id === projId);
        let idCounter = 1;
        const prefix = isEnglish ? 'item-' : 'ce-';
        // 统计所有项目中的最大ID
        for (const e of unifiedTree) {
            for (const g of e.groups) {
                for (const i of g.items) {
                    const num = parseInt(i.id.replace(prefix, ''));
                    if (!isNaN(num) && num >= idCounter) idCounter = num + 1;
                }
            }
        }
        const finalId = prefix + idCounter;

        let newItem;
        if (isEnglish) {
            newItem = {
                id: finalId, content: title, type: group, meaning: counter,
                note: analysis, tags, forgotCount: 0, rememberedCount: 0,
                lastReviewDate: '', date: new Date().toISOString().slice(0, 10),
                image, analysisImage
            };
        } else {
            newItem = {
                id: finalId, title, group, tags, proposition,
                counterexample: counter, analysis, callout, image, analysisImage,
                forgotCount: 0, rememberedCount: 0, lastReviewDate: '',
                date: new Date().toISOString().slice(0, 10)
            };
        }

        let targetGroup = entry.groups.find(g => g.name === group);
        if (!targetGroup) {
            targetGroup = { name: group, items: [] };
            entry.groups.push(targetGroup);
            const order = entry.groups.map(g => g.name);
            saveGroupOrder(projId, order);
        }
        targetGroup.items.push(newItem);
        showToast('🎉 添加成功！');
    }

    try {
        flushAll();
        rebuildAll();
        closeModal();

        // 恢复项目下拉状态
        document.getElementById('itemProject').disabled = false;

        if (editId) {
            showItem(projId, editId);
        } else {
            // 显示最后添加的项
            const e = unifiedTree.find(ee => ee.config.id === projId);
            if (e && e.groups.length > 0) {
                const lastG = e.groups[e.groups.length - 1];
                if (lastG.items.length > 0) {
                    showItem(projId, lastG.items[lastG.items.length - 1].id);
                }
            }
        }
    } catch (e) {
        // 保存失败，模态框保持打开，数据不丢失
        console.error('保存失败:', e);
    }
}

// =============================================================
//  删除
// =============================================================
function deleteItem(projId, itemId) {
    if (!confirm('确定要删除此项吗？')) return;

    const entry = unifiedTree.find(e => e.config.id === projId);
    if (!entry) return;

    for (const g of entry.groups) {
        g.items = g.items.filter(i => i.id !== itemId);
    }
    // 清理空分组
    entry.groups = entry.groups.filter(g => g.items.length > 0);

    flushAll();
    rebuildAll();
    showWelcomePage();
    showToast('🗑️ 已删除');
}

// =============================================================
//  Toast
// =============================================================
function showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = 'toast';
    if (type === 'error') toast.classList.add('error');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
}

// =============================================================
//  欢迎页
// =============================================================
function showWelcomePage() {
    document.querySelectorAll('.content-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('welcomePage').classList.add('visible');
    currentView = null;
}

// =============================================================
//  工具函数
// =============================================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// =============================================================
//  统一渲染：Markdown + KaTeX
// =============================================================
function renderContent(text) {
    if (!text) return '';
    let html = '';
    if (typeof marked !== 'undefined') {
        // 先用占位符保护 KaTeX 公式，防止 Markdown 破坏 $ 和 _ 等符号
        const katexBlocks = [];
        // 保护 $$...$$（块级公式，跨行）
        let processed = text.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
            katexBlocks.push(match);
            return `\x00KTX${katexBlocks.length - 1}\x00`;
        });
        // 保护 $...$（行内公式，不跨行）
        processed = processed.replace(/\$([^\n$]+?)\$/g, (match) => {
            katexBlocks.push(match);
            return `\x00KTX${katexBlocks.length - 1}\x00`;
        });
        // Markdown → HTML
        html = marked.parse(processed, { breaks: true });
        // 还原 KaTeX 公式
        html = html.replace(/\x00KTX(\d+)\x00/g, (_, i) => katexBlocks[parseInt(i)]);
    } else {
        html = escapeHtml(text).replace(/\n/g, '<br>');
    }
    return html;
}

// 对已注入 DOM 的元素进行 KaTeX 渲染
function renderKaTeX(el) {
    if (window.renderMathInElement) {
        renderMathInElement(el, {
            delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false}
            ],
            throwOnError: false
        });
    }
}

// 视觉反馈：高亮当前活跃的上传区域（点击标签或区域时触发）
function setActiveImageTarget(target) {
    document.querySelectorAll('.image-upload-area').forEach(el => el.classList.remove('active'));
    const areaId = target === 'analysis' ? 'analysisUploadArea' : 'imageUploadArea';
    const area = document.getElementById(areaId);
    if (area) area.classList.add('active');
}

function previewImage(event, target) {
    const file = event.target.files[0];
    if (!file) return;
    const suffix = target === 'analysis' ? 'A' : 'Q';
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('previewImg' + suffix).src = e.target.result;
        document.getElementById('imagePreview' + suffix).style.display = 'block';
        document.getElementById('imageStatus' + suffix).textContent = '已选择图片';
        document.getElementById('imageStatus' + suffix).classList.add('has-image');
    };
    reader.readAsDataURL(file);
}

// 获取当前选中的粘贴目标（根据 active 类）
function getActivePasteTarget() {
    const questionArea = document.getElementById('imageUploadArea');
    const analysisArea = document.getElementById('analysisUploadArea');
    if (analysisArea && analysisArea.classList.contains('active')) return 'analysis';
    return 'question'; // 默认或题目区域高亮时
}

// 粘贴图片到指定目标
function pasteImageToTarget(e, target) {
    if (!e.clipboardData || !e.clipboardData.items) return;
    for (const item of e.clipboardData.items) {
        if (item.type && item.type.startsWith('image/')) {
            e.preventDefault();
            e.stopPropagation();
            const file = item.getAsFile();
            if (!file) {
                showToast('无法读取剪贴板图片', 'error');
                return;
            }
            const suffix = target === 'analysis' ? 'A' : 'Q';
            const reader = new FileReader();
            reader.onload = function(ev) {
                document.getElementById('previewImg' + suffix).src = ev.target.result;
                document.getElementById('imagePreview' + suffix).style.display = 'block';
                document.getElementById('imageStatus' + suffix).textContent = '已粘贴图片';
                document.getElementById('imageStatus' + suffix).classList.add('has-image');
            };
            reader.onerror = function() {
                showToast('图片读取失败', 'error');
            };
            reader.readAsDataURL(file);
            showToast('📋 已粘贴' + (target === 'analysis' ? '解析' : '题目') + '图片');
            return;
        }
    }
}

function clearImage(target) {
    const suffix = target === 'analysis' ? 'A' : 'Q';
    document.getElementById('imagePreview' + suffix).style.display = 'none';
    document.getElementById('previewImg' + suffix).removeAttribute('src');
    document.getElementById('imageStatus' + suffix).textContent = '📋 点击选择或 Ctrl+V 粘贴';
    document.getElementById('imageStatus' + suffix).classList.remove('has-image');
    if (target === 'analysis') {
        document.getElementById('itemAnalysisImage').value = '';
    } else {
        document.getElementById('itemImage').value = '';
    }
}

// =============================================================
//  数据导出
// =============================================================
function exportData() {
    const allData = {};
    for (const p of PROJECTS) {
        const raw = loadRawData(p.storageKey);
        if (raw.length > 0) allData[p.storageKey] = raw;
    }
    if (Object.keys(allData).length === 0) {
        showToast('暂无数据可导出', 'error');
        return;
    }
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `22408-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    showToast('📤 数据已导出');
}

// =============================================================
//  数据导入
// =============================================================
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            let count = 0;
            for (const key of Object.keys(data)) {
                if (PROJECTS.some(p => p.storageKey === key) && Array.isArray(data[key])) {
                    saveRawData(key, data[key]);
                    count += data[key].length;
                }
            }
            if (count > 0) {
                rebuildAll();
                showToast(`📥 成功导入 ${count} 项数据`);
            } else {
                showToast('未找到可导入的数据', 'error');
            }
        } catch (err) {
            showToast('文件格式错误，请选择有效的 JSON 文件', 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// =============================================================
//  随机抽题复习
// =============================================================
let quizQueue = [];
let quizIndex = 0;
let quizRevealed = false;

function startRandomQuiz() {
    const filterProjId = document.getElementById('quizProjectFilter').value;
    const count = parseInt(document.getElementById('quizCount').value) || 10;

    // 收集所有符合条件的题目
    let pool = [];
    for (const entry of unifiedTree) {
        if (filterProjId !== 'all' && entry.config.id !== filterProjId) continue;
        for (const g of entry.groups) {
            for (const item of g.items) {
                pool.push({ item, config: entry.config, group: g.name });
            }
        }
    }

    if (pool.length === 0) {
        showToast('当前没有可复习的题目', 'error');
        return;
    }

    // 随机打乱
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    quizQueue = pool.slice(0, Math.min(count, pool.length));
    quizIndex = 0;
    quizRevealed = false;

    // 隐藏欢迎页和内容
    document.getElementById('welcomePage').classList.remove('visible');
    document.querySelectorAll('.content-item').forEach(el => el.classList.remove('active'));

    // 显示复习区
    document.getElementById('quizArea').style.display = 'block';

    // 填充项目筛选器
    const filter = document.getElementById('quizProjectFilter');
    filter.innerHTML = '<option value="all">全部项目</option>' +
        PROJECTS.map(p => `<option value="${p.id}" ${p.id === filterProjId ? 'selected' : ''}>${p.icon} ${p.name}</option>`).join('');

    showQuizCard();
}

function showQuizCard() {
    if (quizIndex >= quizQueue.length) {
        document.getElementById('quizContent').innerHTML = `
            <div style="text-align:center;padding:20px;">
                <div style="font-size:40pt;margin-bottom:12px;">🎉</div>
                <h2 style="color:var(--primary-dark);margin:0 0 8px 0;">复习完成！</h2>
                <p style="color:var(--text-muted);font-size:11pt;">共完成 ${quizQueue.length} 题</p>
            </div>
        `;
        document.getElementById('quizActions').style.display = 'none';
        document.getElementById('quizProgress').textContent = `已完成 ${quizQueue.length}/${quizQueue.length}`;
        return;
    }

    const { item, config, group } = quizQueue[quizIndex];
    const isEnglish = config.type === 'english';
    const title = isEnglish ? (item.content || '') : (item.title || '');
    const tagsHtml = (item.tags || []).map(t => `<span class="quiz-tag">${t}</span>`).join('');
    const imageHtml = item.image ? `<div class="quiz-image"><img src="${item.image}" alt="题目图片" onclick="this.classList.toggle('quiz-image-expanded')"></div>` : '';
    const analysisImageHtml = item.analysisImage ? `<div style="margin-top:12px;"><div class="answer-label" style="margin-bottom:4px;">📖 解析图片：</div><div class="quiz-image"><img src="${item.analysisImage}" alt="解析图片" onclick="this.classList.toggle('quiz-image-expanded')"></div></div>` : '';

    // 构建答案内容
    let answerHtml = '';
    if (isEnglish) {
        if (item.meaning) answerHtml += `<div><span class="answer-label">📖 释义：</span>${renderContent(item.meaning)}</div>`;
        if (item.note) answerHtml += `<div style="margin-top:8px;"><span class="answer-label">💡 备注：</span>${renderContent(item.note)}</div>`;
    } else {
        if (item.proposition) answerHtml += `<div><span class="answer-label">📌 考点：</span>${renderContent(item.proposition)}</div>`;
        if (item.counterexample) answerHtml += `<div style="margin-top:8px;"><span class="answer-label">⚠️ 易错点：</span>${renderContent(item.counterexample)}</div>`;
        if (item.analysis) answerHtml += `<div style="margin-top:8px;">${renderContent(item.analysis)}</div>`;
        if (item.callout) answerHtml += `<div style="margin-top:8px;color:var(--danger);font-weight:600;">💡 ${renderContent(item.callout)}</div>`;
    }
    answerHtml += analysisImageHtml;

    document.getElementById('quizContent').innerHTML = `
        <div class="quiz-tags">${tagsHtml}</div>
        <span class="quiz-project-badge" style="background:${config.color}">${config.icon} ${config.name} · ${group}</span>
        ${imageHtml}
        <div class="quiz-question">${renderContent(title)}</div>
        <div class="quiz-answer" id="quizAnswer">${answerHtml}</div>
    `;

    document.getElementById('quizActions').style.display = 'flex';
    document.getElementById('quizRevealBtn').style.display = 'inline-block';
    document.getElementById('quizNextBtn').style.display = 'none';
    document.getElementById('quizAnswer').classList.remove('show');
    document.getElementById('quizProgress').textContent = `${quizIndex + 1} / ${quizQueue.length}`;
    quizRevealed = false;

    // 渲染 KaTeX
    renderKaTeX(document.getElementById('quizContent'));
}

function revealAnswer() {
    if (quizRevealed) return;
    quizRevealed = true;
    document.getElementById('quizAnswer').classList.add('show');
    document.getElementById('quizRevealBtn').style.display = 'none';
    document.getElementById('quizNextBtn').style.display = 'inline-block';
    // 更新复习日期
    if (quizQueue[quizIndex]) {
        const { item, config } = quizQueue[quizIndex];
        item.lastReviewDate = new Date().toISOString().slice(0, 10);
        // 写回原始数据
        for (const entry of unifiedTree) {
            if (entry.config.id === config.id) {
                for (const g of entry.groups) {
                    const found = g.items.find(i => i.id === item.id);
                    if (found) found.lastReviewDate = item.lastReviewDate;
                }
            }
        }
        flushAll();
    }
}

function nextQuiz() {
    quizIndex++;
    showQuizCard();
}

function exitQuiz() {
    document.getElementById('quizArea').style.display = 'none';
    document.getElementById('welcomePage').classList.add('visible');
    quizQueue = [];
    quizIndex = 0;
}

function onQuizFilterChange() {
    // 选择项目筛选后自动重新抽题
    startRandomQuiz();
}

// =============================================================
//  初始化
// =============================================================
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('modalOverlay').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });
    document.getElementById('statsOverlay').addEventListener('click', function(e) {
        if (e.target === this) closeStats();
    });
    // 全局 Ctrl+V 粘贴图片（仅在模态框打开时响应）
    document.addEventListener('paste', function(e) {
        const overlay = document.getElementById('modalOverlay');
        if (overlay && overlay.classList.contains('active')) {
            const target = getActivePasteTarget();
            pasteImageToTarget(e, target);
        }
    });

    // 一级默认全部折叠，用户点击才展开
    expandedProjects.clear();
    saveExpandedProjects(expandedProjects);
    expandedGroups.clear();
    saveExpandedGroups2(expandedGroups);

    rebuildAll();
});
