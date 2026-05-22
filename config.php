<?php
//// CREATED BY SIEDEL CABRALES
/// MYSQL database connection setup
//$host = "localhost";
//$db_name = "fms_db";
//$db_user = "root";
//$db_pass = "";

//$conn =mysqli_connect($host,$db_user,$db_pass)or die(mysqli_eror());
//mysqli_select_db($conn,$db_name)or die(mysqli_eror());
?>


<?php
/** MS SQL Server Configuration - OPTIMIZED FOR YOUR SETUP Server: localhost\SQLEXPRESS02 Authentication: Windows Authentication */

// Server configuration (using Windows Authentication)
$serverName = "localhost\\SQLEXPRESS02";  // Double backslash is correct for PHP

// Connection options - optimized for reliability
$connectionOptions = array(
    "Database" => "PAYROLL",                    // Your database name
    "TrustServerCertificate" => true,         // From your image settings
    "Encrypt" => true,                        // Mandatory encryption
    "CharacterSet" => "UTF-8",                // Best for Unicode support
    "ReturnDatesAsStrings" => true,           // Easier date handling
    "LoginTimeout" => 60                      // 60 seconds timeout
    // No Uid/PWD needed - using Windows Authentication
);

// Check if sqlsrv extension is loaded
if (!extension_loaded('sqlsrv')) {
    die("<div style='color: red; padding: 15px; border: 2px solid red; background: #ffeeee; font-family: Arial;'>
        <h3>X SQL Server Extension Missing</h3>
        <p><strong>Error:</strong> The 'sqlsrv' PHP extension is not installed or enabled.</p>
        <hr>
        <strong>Solution:</strong><br>
        1. Install Microsoft Drivers for PHP for SQL Server<br>
        2. Extract and copy php_sqlsrv.dll to your PHP extensions folder<br>
        3. Add 'extension=php_sqlsrv.dll' to your php.ini<br>
        4. Restart your web server<br>
        </div>");
}

// Establish connection
$conn = sqlsrv_connect($serverName, $connectionOptions);

// Error handling
if ($conn === false) {
    // Clear any previous output
    if (ob_get_length()) ob_clean();
    
    // Display user-friendly error
    die("<div style='color: red; padding: 15px; border: 2px solid red; background: #ffeeee; font-family: Arial;'>
        <h3>X Database Connection Failed</h3>
        <p><strong>Server:</strong> {$serverName}</p>
        <p><strong>Database:</strong> {$connectionOptions['Database']}</p>
        <p><strong>Authentication:</strong> Windows Authentication</p>
        <hr>
        <strong>Possible Solutions:</strong><br> Make sure SQL Server Browser service is running<br> Check if database 'dtbnk' exists in SQL Server<br> Verify your Windows account has access to the database<br> Enable TCP/IP protocol in SQL Server Configuration Manager<br> <hr>
        <strong>Technical Details:</strong><br>
        <pre>" . (function_exists('sqlsrv_errors') ? print_r(sqlsrv_errors(), true) : print_r(error_get_last(), true)) . "</pre>
        </div>");
}

// Optional: Set optimal session settings
$session_settings = "
    SET QUOTED_IDENTIFIER ON;
    SET ANSI_NULLS ON;
    SET ANSI_WARNINGS ON;
";
sqlsrv_query($conn, $session_settings);

// Connection successful (you can uncomment for testing)
// echo "<div style='color: green;'>✓ Connected to MS SQL Server successfully!</div>";

?>
