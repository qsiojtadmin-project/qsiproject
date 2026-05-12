<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="tabs.css" rel="stylesheet">
    <title>Tabs System</title>
</head>
<body>
    <div class="tabs-container">
        <div class="tabs-header">
            <div class="tab-buttons" id="tabButtons">
                <!-- Pre-defined tabs will be added here by JavaScript -->
            </div>
            <div class="add-buttons">
                <button id="addAccountingTab" class="add-tab-btn accounting">📊 Accounting</button>
                <button id="addSettingsTab" class="add-tab-btn settings">⚙️ Settings</button>
                <button id="addReportsTab" class="add-tab-btn reports">📈 Reports</button>
                <button id="addUsersTab" class="add-tab-btn users">👥 Users</button>
            </div>
        </div>
        <div class="tab-content" id="tabContent"></div>
    </div>
</body>
<script src="tabs.js"></script>
</html>