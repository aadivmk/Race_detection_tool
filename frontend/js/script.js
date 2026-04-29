// Global API base URL
const API_BASE = 'http://localhost:5000/api';

// Navbar functionality
document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });
    
    // Close mobile menu on link click
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
    
    // Smooth scrolling and active nav highlighting
    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('section');
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (scrollY >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${current}`) {
                link.classList.add('active');
            }
        });
    });
    
    // Initialize page-specific functionality
    if (window.location.pathname.includes('analyzer.html')) {
        initAnalyzer();
    }
});

// Race Condition Analyzer functionality
function initAnalyzer() {
    const analyzeBtn = document.getElementById('analyze-btn');
    const resultDiv = document.getElementById('analysis-result');
    const visualizationCanvas = document.getElementById('timeline-canvas');
    
    if (!analyzeBtn) return;
    
    analyzeBtn.addEventListener('click', async () => {
        const threadsData = collectThreadsData();
        const resourcesData = collectResourcesData();
        
        if (!validateInput(threadsData, resourcesData)) {
            showAlert('Please fill all required fields', 'warning');
            return;
        }
        
        try {
            showLoading();
            
            const response = await fetch(`${API_BASE}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    threads: threadsData,
                    resources: resourcesData
                })
            });
            
            const result = await response.json();
            displayAnalysisResult(result);
            // Show and render the visualization section
            const vizSection = document.getElementById('visualization-section');
            if (vizSection) vizSection.style.display = 'block';
            renderTimeline(result.result.conflicts, result.result.affected_resources, threadsData);
            // Scroll to results
            document.getElementById('analysis-result').scrollIntoView({ behavior: 'smooth', block: 'start' });
            
        } catch (error) {
            showAlert('Analysis failed. Please check backend server is running on port 5000.', 'danger');
            console.error('Analysis error:', error);
        } finally {
            hideLoading();
        }
    });
}

function collectThreadsData() {
    const threads = [];
    document.querySelectorAll('.thread-input').forEach((threadEl, index) => {
        const operations = [];
        threadEl.querySelectorAll('.operation-input').forEach(opEl => {
            const resource = opEl.querySelector('.resource-select').value;
            const type = opEl.querySelector('.op-type').value;
            const time = parseInt(opEl.querySelector('.time-input').value) || 0;
            
            operations.push({ resource, type, time });
        });
        threads.push({ id: index + 1, operations });
    });
    return threads;
}

function collectResourcesData() {
    const resources = [];
    document.querySelectorAll('.resource-item').forEach(el => {
        const name = el.querySelector('.resource-name').value;
        // Check if initial value input exists, otherwise default to 0
        const initialInput = el.querySelector('.initial-value');
        const initialValue = initialInput ? initialInput.value : 0;
        
        if (name.trim()) {
            resources.push({ 
                name: name.trim(), 
                initialValue: parseFloat(initialValue) || 0 
            });
        }
    });
    return resources;
}

function validateInput(threads, resources) {
    if (threads.length === 0 || resources.length === 0) return false;
    
    for (let thread of threads) {
        if (thread.operations.length === 0) return false;
    }
    return true;
}

function displayAnalysisResult(result) {
    const resultDiv = document.getElementById('analysis-result');
    const severityClass = `severity-${result.result.severity.toLowerCase()}`;
    
    resultDiv.innerHTML = `
        <div class="result-card ${severityClass}">
            <h2><i class="fas fa-${getSeverityIcon(result.result.severity)}"></i>
                ${result.result.severity} Risk Detected
            </h2>
            <p class="severity-text">
                ${getSeverityMessage(result.result.severity, result.result.total_conflicts)}
            </p>
            <div class="stats-grid">
                <div class="stat">
                    <span class="stat-number">${result.result.total_conflicts}</span>
                    <span>Conflicts</span>
                </div>
                <div class="stat">
                    <span class="stat-number">${result.result.affected_resources.length}</span>
                    <span>Resources</span>
                </div>
            </div>
        </div>
        
        ${result.result.conflicts.length > 0 ? `
        <div class="conflict-list">
            <h3><i class="fas fa-exclamation-triangle"></i> Conflict Details</h3>
            ${result.result.conflicts.map(conflict => `
                <div class="conflict-item">
                    <div>
                        <strong>${conflict.thread1}</strong> (${conflict.op1_type}) 
                        vs <strong>${conflict.thread2}</strong> (${conflict.op2_type})
                        on <strong>${conflict.resource}</strong>
                    </div>
                    <span class="severity-badge severity-${getConflictSeverity(conflict)}">
                        ${getConflictSeverity(conflict).toUpperCase()}
                    </span>
                </div>
            `).join('')}
        </div>
        ` : ''}
        
        <div class="solutions-section">
            <h3><i class="fas fa-lightbulb"></i> Recommended Solutions</h3>
            ${result.solutions.map(solution => `
                <div class="solution-item">
                    <i class="fas fa-check-circle"></i>
                    ${solution}
                </div>
            `).join('')}
        </div>
    `;
}

function renderTimeline(conflicts, affectedResources, threads) {
    const canvas = document.getElementById('timeline-canvas');
    const ctx = canvas.getContext('2d');

    // Layout constants
    const PAD_LEFT   = 70;
    const PAD_RIGHT  = 30;
    const PAD_TOP    = 50;
    const ROW_H      = 80;
    const AXIS_H     = 40;
    const LEGEND_H   = 45;
    const numThreads = threads.length;

    // Resize canvas dynamically
    const totalH = PAD_TOP + numThreads * ROW_H + AXIS_H + LEGEND_H;
    canvas.height = totalH;
    canvas.width  = canvas.parentElement ? (canvas.parentElement.clientWidth - 40) || 800 : 800;
    const W = canvas.width;
    const timelineW = W - PAD_LEFT - PAD_RIGHT;

    // Find max time across all operations
    let maxTime = 0;
    threads.forEach(t => t.operations.forEach(op => { if (op.time > maxTime) maxTime = op.time; }));
    if (maxTime === 0) maxTime = threads.reduce((acc, t) => acc + t.operations.length, 0); // fallback

    const timeToX = t => PAD_LEFT + (t / maxTime) * timelineW;
    const threadY = i => PAD_TOP + i * ROW_H + ROW_H / 2;

    // ── Background ──────────────────────────────────────────────────────────
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, W, totalH);

    // Subtle grid lines
    const tickSteps = Math.min(maxTime, 10);
    for (let i = 0; i <= tickSteps; i++) {
        const t = (maxTime / tickSteps) * i;
        const x = timeToX(t);
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(x, PAD_TOP - 10);
        ctx.lineTo(x, PAD_TOP + numThreads * ROW_H);
        ctx.stroke();
        // Tick label
        ctx.fillStyle = '#475569';
        ctx.font = '11px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`t=${Math.round(t)}`, x, PAD_TOP + numThreads * ROW_H + 20);
    }

    // Axis label
    ctx.fillStyle = '#475569';
    ctx.font = '11px Poppins, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Time →', PAD_LEFT + timelineW / 2, PAD_TOP + numThreads * ROW_H + 38);

    // Title
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 12px Poppins, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('EXECUTION TIMELINE', PAD_LEFT, 30);

    // ── Thread colours ───────────────────────────────────────────────────────
    const THREAD_COLORS = ['#10b981','#f59e0b','#8b5cf6','#06b6d4','#f97316','#ec4899'];

    // Precompute conflict set for quick lookup
    const conflictedOps = new Set();
    conflicts.forEach(c => {
        const ti1 = parseInt(c.thread1.replace('T','')) - 1;
        const ti2 = parseInt(c.thread2.replace('T','')) - 1;
        conflictedOps.add(`${ti1}-${c.resource}`);
        conflictedOps.add(`${ti2}-${c.resource}`);
    });

    // ── Draw each thread ────────────────────────────────────────────────────
    threads.forEach((thread, tIdx) => {
        const y      = threadY(tIdx);
        const color  = THREAD_COLORS[tIdx % THREAD_COLORS.length];
        const numOps = thread.operations.length;

        // Thread label
        ctx.fillStyle = color;
        ctx.font = 'bold 13px Poppins, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`T${tIdx + 1}`, PAD_LEFT - 10, y + 5);

        // Dashed baseline
        ctx.strokeStyle = color + '30';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(PAD_LEFT, y);
        ctx.lineTo(W - PAD_RIGHT, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Operations
        thread.operations.forEach((op, opIdx) => {
            // Use time value; if all 0 distribute evenly
            const rawT  = op.time || 0;
            const effT  = rawT === 0 ? (opIdx + 1) * (maxTime / (numOps + 1)) : rawT;
            const x     = timeToX(effT);
            const isConflict = conflictedOps.has(`${tIdx}-${op.resource}`);
            const isWrite    = op.type === 'write';

            // Choose colour
            const dotColor = isConflict ? '#ef4444' : (isWrite ? '#f59e0b' : '#3b82f6');
            const radius   = isConflict ? 11 : 9;

            // Glow
            if (isConflict) { ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 16; }
            else if (isWrite) { ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 8; }
            else { ctx.shadowColor = '#3b82f6'; ctx.shadowBlur = 8; }

            // Outer ring
            ctx.strokeStyle = dotColor;
            ctx.lineWidth   = 2;
            ctx.beginPath();
            ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
            ctx.stroke();

            // Fill circle
            ctx.fillStyle = dotColor;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // R / W label inside circle
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 9px Poppins, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(isWrite ? 'W' : 'R', x, y + 3);

            // Resource name below
            ctx.fillStyle = '#94a3b8';
            ctx.font = '9px Poppins, sans-serif';
            ctx.fillText(op.resource, x, y + radius + 16);
        });
    });

    // ── Conflict connectors ─────────────────────────────────────────────────
    conflicts.forEach(conflict => {
        const ti1 = parseInt(conflict.thread1.replace('T','')) - 1;
        const ti2 = parseInt(conflict.thread2.replace('T','')) - 1;
        const y1  = threadY(ti1);
        const y2  = threadY(ti2);

        // Find x from the conflicting op in thread1
        const ops1   = threads[ti1] ? threads[ti1].operations : [];
        const numOps = ops1.length;
        const confOp = ops1.find(op => op.resource === conflict.resource);
        const rawT   = confOp ? confOp.time : 0;
        const opIdx  = confOp ? ops1.indexOf(confOp) : 0;
        const effT   = rawT === 0 ? (opIdx + 1) * (maxTime / (numOps + 1)) : rawT;
        const x      = timeToX(effT);

        // Dashed red connector line
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur  = 10;
        ctx.strokeStyle = 'rgba(239,68,68,0.6)';
        ctx.lineWidth   = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, y1 + 14);
        ctx.lineTo(x, y2 - 14);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        // ⚡ Conflict badge at midpoint
        const midY = (y1 + y2) / 2;
        ctx.fillStyle = 'rgba(239,68,68,0.15)';
        ctx.beginPath();
        ctx.roundRect(x - 40, midY - 12, 80, 24, 6);
        ctx.fill();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 10px Poppins, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚡ CONFLICT', x, midY + 4);
    });

    // ── Legend ───────────────────────────────────────────────────────────────
    const legendY = PAD_TOP + numThreads * ROW_H + AXIS_H + 15;
    const items = [
        { color: '#3b82f6', label: 'Read (R)' },
        { color: '#f59e0b', label: 'Write (W)' },
        { color: '#ef4444', label: 'Conflict' },
    ];
    let lx = PAD_LEFT;
    items.forEach(item => {
        ctx.fillStyle = item.color;
        ctx.shadowColor = item.color;
        ctx.shadowBlur  = 6;
        ctx.beginPath();
        ctx.arc(lx + 8, legendY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px Poppins, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(item.label, lx + 22, legendY + 4);
        lx += 120;
    });
}

function getSeverityIcon(severity) {
    const icons = {
        'Safe': 'shield-alt',
        'Low': 'exclamation-circle',
        'Medium': 'exclamation-triangle',
        'High': 'exclamation'
    };
    return icons[severity] || 'bug';
}

function getSeverityMessage(severity, count) {
    const messages = {
        'Safe': `Excellent! No race conditions detected in your multithreaded application.`,
        'Low': `Minor issues found. ${count} potential conflicts identified.`,
        'Medium': `⚠️ Medium risk detected. ${count} conflicts need attention.`,
        'High': `🚨 Critical! ${count} serious race conditions detected.`
    };
    return messages[severity] || '';
}

function getConflictSeverity(conflict) {
    if (conflict.op1_type === 'write' && conflict.op2_type === 'write') return 'high';
    if (conflict.op1_type === 'write' || conflict.op2_type === 'write') return 'medium';
    return 'low';
}

function showLoading() {
    document.getElementById('analyze-btn').innerHTML = 
        '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
    document.getElementById('analyze-btn').disabled = true;
}

function hideLoading() {
    const btn = document.getElementById('analyze-btn');
    btn.innerHTML = '<i class="fas fa-rocket"></i> Analyze Race Conditions';
    btn.disabled = false;
}

function showAlert(message, type) {
    const colorMap = {
        'danger':  '#ef4444',
        'warning': '#f59e0b',
        'success': '#10b981',
    };
    const iconMap = {
        'danger':  'times-circle',
        'warning': 'exclamation-triangle',
        'success': 'check-circle',
    };
    const bg = colorMap[type] || '#2563eb';
    const icon = iconMap[type] || 'info-circle';

    const alert = document.createElement('div');
    alert.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    alert.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        background: ${bg};
        color: white;
        padding: 15px 22px;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.25);
        z-index: 10000;
        font-family: 'Poppins', sans-serif;
        font-size: 0.95rem;
        max-width: 380px;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: opacity 0.5s ease;
    `;

    document.body.appendChild(alert);
    setTimeout(() => { alert.style.opacity = '0'; }, 3500);
    setTimeout(() => { alert.remove(); }, 4000);
}

// Dynamic thread/operation/resource management
function addThread() {
    const container = document.getElementById('threads-container');
    const threadCount = container.children.length + 1;
    
    const threadHTML = `
        <div class="thread-input">
            <div class="thread-header">
                <div class="thread-number">T${threadCount}</div>
                <button type="button" onclick="removeThread(this)" class="btn-remove">
                    <i class="fas fa-times"></i> Remove
                </button>
            </div>
            <div class="operations-container">
                <div class="operation-input">
                    <select class="resource-select">
                        <option value="">Select Resource</option>
                    </select>
                    <select class="op-type">
                        <option value="read">Read</option>
                        <option value="write">Write</option>
                    </select>
                    <input type="number" class="time-input" placeholder="Time" min="0" value="0">
                    <button type="button" onclick="removeOperation(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <button type="button" onclick="addOperation(this)" class="btn btn-sm btn-outline mt-3">
                <i class="fas fa-plus"></i> Add Operation
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', threadHTML);
    updateResourceSelects();
}

function addResource() {
    const container = document.getElementById('resources-container');
    const resourceHTML = `
        <div class="resource-input resource-item">
            <div class="resource-header">
                <input type="text" class="resource-name" placeholder="Resource Name (e.g., balance)">
                <input type="number" class="initial-value" placeholder="Initial Value" value="0">
                <button type="button" onclick="removeResource(this)" class="btn-remove">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    container.insertAdjacentHTML('beforeend', resourceHTML);
    updateResourceSelects();
}

function addOperation(btn) {
    const container = btn.parentElement.querySelector('.operations-container');
    const resourceSelect = container.querySelector('.resource-select').cloneNode(true);
    
    const opHTML = `
        <div class="operation-input">
            <select class="resource-select">${resourceSelect.innerHTML}</select>
            <select class="op-type">
                <option value="read">Read</option>
                <option value="write">Write</option>
            </select>
            <input type="number" class="time-input" placeholder="Time" min="0" value="0">
            <button type="button" onclick="removeOperation(this)">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', opHTML);
    updateResourceSelects();
}

function removeThread(btn) {
    if (document.querySelectorAll('.thread-input').length > 1) {
        btn.closest('.thread-input').remove();
        updateThreadNumbers();
    }
}

function removeResource(btn) {
    if (document.querySelectorAll('.resource-item').length > 1) {
        btn.closest('.resource-item').remove();
        updateResourceSelects();
    }
}

function removeOperation(btn) {
    const threadContainer = btn.closest('.thread-input');
    if (threadContainer.querySelectorAll('.operation-input').length > 1) {
        btn.closest('.operation-input').remove();
    }
}

function updateThreadNumbers() {
    document.querySelectorAll('.thread-input').forEach((thread, index) => {
        thread.querySelector('.thread-number').textContent = `T${index + 1}`;
    });
}

function updateResourceSelects() {
    const resources = Array.from(document.querySelectorAll('.resource-name'))
        .map(input => input.value)
        .filter(name => name.trim());
    
    document.querySelectorAll('.resource-select').forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Resource</option>';
        
        resources.forEach(resource => {
            const option = document.createElement('option');
            option.value = resource;
            option.textContent = resource;
            if (resource === currentValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    });
}

// Sample data loader
function loadSampleData(type) {
    if (type === 'unsafe') {
        // Clear existing threads/resources
        document.getElementById('threads-container').innerHTML = '';
        document.getElementById('resources-container').innerHTML = '';
        
        // Step 1: Add resource and set name + initial value
        addResource();
        document.querySelector('.resource-name').value = 'bank_balance';
        document.querySelector('.initial-value').value = '1000';
        updateResourceSelects();
        
        // Step 2: Add threads and wire up selects after DOM updates
        addThread();
        addThread();
        
        // Step 3: Wait for resource selects to populate, then set values
        setTimeout(() => {
            updateResourceSelects();
            const selects = document.querySelectorAll('.resource-select');
            const opTypes = document.querySelectorAll('.op-type');
            const timeInputs = document.querySelectorAll('.time-input');
            
            if (selects[0]) selects[0].value = 'bank_balance';
            if (opTypes[0]) opTypes[0].value = 'write';
            if (timeInputs[0]) timeInputs[0].value = '100';
            
            if (selects[1]) selects[1].value = 'bank_balance';
            if (opTypes[1]) opTypes[1].value = 'write';
            if (timeInputs[1]) timeInputs[1].value = '105';
            
            showAlert('Sample data loaded! Click Analyze to detect the race condition.', 'success');
        }, 50);
    }
}

// Initialize with sample data button
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('load-sample-btn')) {
        document.getElementById('load-sample-btn').addEventListener('click', () => {
            loadSampleData('unsafe');
        });
    }
});