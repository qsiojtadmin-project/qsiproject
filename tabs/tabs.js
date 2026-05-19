let activeTab = null;
let loadedTabs = {};

// Define tab configurations with their PHP files
const tabConfigs = {
    accounting: {
        title: 'Accounting',
        file: 'accounting.php',
        icon: '📊',
        color: '#28a745'
    },
    settings: {
        title: 'Settings',
        file: 'settings.php',
        icon: '⚙️',
        color: '#17a2b8'
    },
    reports: {
        title: 'Reports',
        file: 'reports.php',
        icon: '📈',
        color: '#ffc107'
    },
    users: {
        title: 'Users',
        file: 'users.php',
        icon: '👥',
        color: '#dc3545'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners for each add button
    document.getElementById('addAccountingTab').addEventListener('click', () => {
        addTab('accounting');
    });
    
    document.getElementById('addSettingsTab').addEventListener('click', () => {
        addTab('settings');
    });
    
    document.getElementById('addReportsTab').addEventListener('click', () => {
        addTab('reports');
    });
    
    document.getElementById('addUsersTab').addEventListener('click', () => {
        addTab('users');
    });
    
    // Add default tab on load
    addTab('accounting');
});

function addTab(tabType) {
    const config = tabConfigs[tabType];
    if (!config) return;
    
    // Check if a tab of this type already exists
    const existingTab = document.querySelector(`.tab-btn[data-type="${tabType}"]`);
    if (existingTab) {
        // Switch to existing tab instead of creating new one
        const tabId = existingTab.dataset.tab;
        activateTab(tabId);
        return;
    }
    
    const tabId = tabType; // Use tabType as ID (no numbers)
    const uniqueFileId = `${tabType}-${Date.now()}`;
    
    // Store tab info
    loadedTabs[tabId] = {
        type: tabType,
        fileId: uniqueFileId,
        config: config
    };
    
    // Create tab button
    const tabBtn = document.createElement('button');
    tabBtn.className = 'tab-btn';
    tabBtn.dataset.tab = tabId;
    tabBtn.dataset.type = tabType;
    tabBtn.style.borderLeft = `3px solid ${config.color}`;
    
    // Add icon
    const icon = document.createElement('span');
    icon.className = 'tab-icon';
    icon.textContent = config.icon;
    tabBtn.appendChild(icon);
    
    // Add title (no number)
    const titleSpan = document.createElement('span');
    titleSpan.textContent = config.title;
    titleSpan.className = 'tab-title';
    tabBtn.appendChild(titleSpan);
    
    // Create delete button
    const deleteBtn = document.createElement('span');
    deleteBtn.textContent = '✕';
    deleteBtn.className = 'delete-tab';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteTab(tabId, tabBtn);
    };
    
    tabBtn.appendChild(deleteBtn);
    tabBtn.onclick = () => activateTab(tabId);
    document.getElementById('tabButtons').appendChild(tabBtn);
    
    // Create content panel
    const content = document.createElement('div');
    content.className = 'tab-pane';
    content.id = tabId;
    content.innerHTML = `
        <div class="tab-content-area">
            <div class="loading-spinner">Loading ${config.title}...</div>
            <iframe 
                src="${config.file}?id=${uniqueFileId}&t=${Date.now()}" 
                class="tab-iframe"
                style="display: none;"
                frameborder="0"
            ></iframe>
        </div>
    `;
    
    document.getElementById('tabContent').appendChild(content);
    
    // Load iframe content
    const iframe = content.querySelector('iframe');
    const spinner = content.querySelector('.loading-spinner');
    
    iframe.onload = () => {
        spinner.style.display = 'none';
        iframe.style.display = 'block';
    };
    
    activateTab(tabId);
}

function activateTab(tabId) {
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Remove active class from all content panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Add active class to selected tab button
    const selectedBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Add active class to selected content pane
    const selectedPane = document.getElementById(tabId);
    if (selectedPane) {
        selectedPane.classList.add('active');
    }
    
    activeTab = tabId;
}

function deleteTab(tabId, tabBtn) {
    const allTabs = document.querySelectorAll('.tab-btn');
    if (allTabs.length === 1) {
        alert("Cannot delete the last tab");
        return;
    }
    
    // Remove the tab button
    tabBtn.remove();
    
    // Remove the content panel
    const contentPane = document.getElementById(tabId);
    if (contentPane) {
        contentPane.remove();
    }
    
    // Remove from loaded tabs
    delete loadedTabs[tabId];
    
    // Activate the first remaining tab if the deleted tab was active
    if (activeTab === tabId) {
        const remainingTabs = document.querySelectorAll('.tab-btn');
        if (remainingTabs.length > 0) {
            const firstTabId = remainingTabs[0].dataset.tab;
            activateTab(firstTabId);
        }
    }
}