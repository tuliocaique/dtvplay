CREATE TABLE application (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    application_id VARCHAR(255) NOT NULL UNIQUE,
    application_name VARCHAR(100) NOT NULL,
    is_authorized TINYINT(1) DEFAULT 0 COMMENT "0 NOT/ 1 YES",
    is_paired TINYINT(1) DEFAULT 0 COMMENT "0 NOT/ 1 YES",
    created DATETIME DEFAULT NOW(),
    updated DATETIME DEFAULT NOW()
);