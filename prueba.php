hola
<?php

/**
 * 
 * mysql> CREATE USER 'user_db'@'localhost' IDENTIFIED BY 'fmD882&|';
 * Query OK, 0 rows affected (0,02 sec)
 * 
 * 
 * mysql> GRANT SELECT, INSERT, UPDATE, DELETE ON Syncrinybot.* TO 'user_db'@'localhost';
 * Query OK, 0 rows affected (0,03 sec)
 */

ini_set('display_errors', 1);
error_reporting(E_ALL);

$servername = "localhost";
$username = "user_db";
$password = "fmD882&|";
$dbname = "Syncrinybot";


// Verbindung erstellen

$conn = mysqli_connect($servername, $username, $password, $dbname);

// Verbindung prüfen
if (!$conn) {
    die("error: " . mysqli_connect_error());
}
echo "conexión correcta";

$sql = "SELECT * FROM usuarios";
$result = mysqli_query ($conn, $sql);

while ($row = mysqli_fetch_assoc($result)) {
    print_r($row);
}

mysqli_close($conn);

?>